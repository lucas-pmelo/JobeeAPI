const User = require("../models/users");
const Job = require("../models/jobs");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const ErrorHandler = require("../utils/errorHandler");
const sendToken = require("../utils/jwtToken");
const fs = require("fs");
const APIFilters = require("../utils/apiFilters");

// Pegando o perfil do usuario atual => /api/v1/me
exports.getUserProfile = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.user.id).populate({
        path: "jobsPublished",
        select: "title postingDate"
    });

    res.status(200).json({
        success: true,
        data: user
    });
});

// Atualizando a senha do usuario atual => /api/v1/password/update
exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.user.id).select("+password");

    // Checando senha anterior
    const isMatched = await user.comparePassword(req.body.currentPassword);
    if (!isMatched) {
        return next(new ErrorHandler("Old password is incorrect.", 401));
    }

    user.password = req.body.newPassword;
    await user.save();

    sendToken(user, 200, res);
});

// Atualizando o perfil do usuario atual => /api/v1/me/update
exports.updateUser = catchAsyncErrors(async (req, res, next) => {
    const newUserData = {
        name: req.body.name,
        email: req.body.email
    };

    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false
    });

    res.status(200).json({
        success: true,
        data: user
    });
});

// Mostra todos os jobs aplicados => /api/v1/jobs/applied
exports.getAppliedJobs = catchAsyncErrors(async (req, res, next) => {
    const jobs = await Job.find({
        "applicantsApplied.id": req.user.id
    }).select("+applicantsApplied");

    res.status(200).json({
        success: true,
        results: jobs.length,
        data: jobs
    });
});

// Mostra todos os jobs publicados por um empregador => /api/v1/jobs/published
exports.getPublishedJobs = catchAsyncErrors(async (req, res, next) => {
    const jobs = await Job.find({ user: req.user.id });

    res.status(200).json({
        success: true,
        results: jobs.length,
        data: jobs
    });
});

// Deletando o usuario atual => /api/v1/me/delete
exports.deleteUser = catchAsyncErrors(async (req, res, next) => {
    deleteUserData(req.user.id, req.user.role);

    const user = await User.findByIdAndDelete(req.user.id);

    res.cookie("token", "none", {
        expires: new Date(Date.now()),
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        message: "Your account has been deleted."
    });
});

// Adicionando metodos do controller que só o admin tem acesso

// Mostra todos os users => /api/v1/admin/users
exports.getUsers = catchAsyncErrors(async (req, res, next) => {
    const apiFilters = new APIFilters(User.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .searchByQuery()
        .pagination();

    const users = await apiFilters.query;

    res.status(200).json({
        success: true,
        results: users.length,
        data: users
    });
});

// Deleta usuario => /api/v1/admin/user/:id
exports.deleteUserAdmin = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return next(new ErrorHandler("User not found.", 404));
    }

    deleteUserData(user.id, user.role);
    await user.remove();

    res.status(200).json({
        success: true,
        message: "User deleted."
    });
});

// Deleta os arquivos do usuario e os jobs do empregador
async function deleteUserData(user, role) {
    if (role === "employer") {
        await Job.deleteMany({ user: user });
    }

    if (role === "user") {
        const appliedJobs = await Job.find({
            "applicantsApplied.id": user
        }).select("+applicantsApplied");
        // console.log(appliedJobs);

        for (let i = 0; i < appliedJobs.length; i++) {
            let obj = appliedJobs[i].applicantsApplied.find(
                (o) => o.id === user
            );

            console.log(__dirname);
            let filepath = `${__dirname}/public/uploads/${obj.resume}`.replace(
                "\\controllers",
                ""
            );

            fs.unlink(filepath, (err) => {
                if (err) {
                    console.log(err);
                }
            });

            appliedJobs[i].applicantsApplied.splice(
                appliedJobs[i].applicantsApplied.indexOf(obj.id)
            );

            await appliedJobs[i].save();
        }
    }
}
