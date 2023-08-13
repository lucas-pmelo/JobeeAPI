const Job = require("../models/jobs");

const geoCoder = require("../utils/geocoder");

const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const APIFilters = require("../utils/apiFilters");
const path = require("path");

// Pega todos os jovs => /api/v1/jobs
exports.getJobs = catchAsyncErrors(async (req, res, next) => {
    const apiFilters = new APIFilters(Job.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .searchByQuery()
        .pagination();

    const jobs = await apiFilters.query;

    res.status(200).json({
        success: true,
        results: jobs.length,
        data: jobs
    });
});

//Criar um novo job => /api/v1/job/new
exports.newJob = catchAsyncErrors(async (req, res, next) => {
    // Adicionar o usuário logado como criador do job
    req.body.user = req.user.id;

    const job = await Job.create(req.body);

    res.status(200).json({
        success: true,
        message: "Job is created",
        data: job
    });
});

// Pegar um único job com id e slug => /api/v1/job/:id/:slug
exports.getJob = catchAsyncErrors(async (req, res, next) => {
    const job = await Job.find({
        $and: [{ _id: req.params.id }, { slug: req.params.slug }]
    });

    if (!job || job.length === 0) {
        return next(new ErrorHandler("Job not found", 404));
    }

    res.status(200).json({
        success: true,
        data: job
    });
});

// Atualizar um job => /api/v1/job/:id
exports.updateJob = catchAsyncErrors(async (req, res, next) => {
    let job = await Job.findById(req.params.id);

    if (!job) {
        return next(new ErrorHandler("Job not found", 404));
    }

    job = await Job.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        message: "Job is updated",
        data: job
    });
});

// Deletar um job => /api/v1/job/:id
exports.deleteJob = catchAsyncErrors(async (req, res, next) => {
    const job = await Job.findById(req.params.id);

    if (!job) {
        return next(new ErrorHandler("Job not found", 404));
    }

    await Job.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success: true,
        message: "Job is deleted",
        data: {}
    });
});

// Procurar um job por região => /api/v1/jobs/:zipcode/:distance
exports.getJobsInRadius = catchAsyncErrors(async (req, res, next) => {
    const { zipcode, distance } = req.params;

    // Pegar a longitude e latitude do zipcode usando o geocoder
    const loc = await geoCoder.geocode(zipcode);
    const latitude = loc[0].latitude;
    const longitude = loc[0].longitude;

    const radius = distance / 3963.2;

    const jobs = await Job.find({
        location: {
            $geoWithin: { $centerSphere: [[longitude, latitude], radius] }
        }
    });

    res.status(200).json({
        success: true,
        results: jobs.length,
        data: jobs
    });
});

// Pegar status sobre um job => /api/v1/stats/:topic
exports.jobStats = catchAsyncErrors(async (req, res, next) => {
    const stats = await Job.aggregate([
        {
            $match: { $text: { $search: '"' + req.params.topic + '"' } }
        },
        {
            $group: {
                _id: { $toUpper: "$experience" },
                totalJobs: { $sum: 1 },
                avgPosition: { $avg: "$positions" },
                avgSalary: { $avg: "$salary" },
                minSalary: { $min: "$salary" },
                maxSalary: { $max: "$salary" }
            }
        }
    ]);

    if (stats.length === 0) {
        return next(
            new ErrorHandler(`No stats found for - ${req.params.topic}`, 200)
        );
    }

    res.status(200).json({
        success: true,
        data: stats
    });
});

// Aplicar para um job usando Resume => /api/v1/job/:id/apply
exports.applyJob = catchAsyncErrors(async (req, res, next) => {
    let job = await Job.findById(req.params.id).select("+applicantsApplied");

    if (!job) {
        return next(new ErrorHandler("Job not found", 404));
    }

    // Checar se o usuário aplicou para um job vencido
    if (job.lastDate < Date.now()) {
        return next(new ErrorHandler("Job application date is expired", 400));
    }

    // Checando se o usuario aplicou anteriormente
    for (let i = 0; i < job.applicantsApplied.length; i++) {
        if (job.applicantsApplied[i].id === req.user._id) {
            return next(
                new ErrorHandler("You have already applied to this job", 400)
            );
        }
    }

    job = await Job.find({
        "applicantsApplied.id": req.user._id
    }).select("+applicantsApplied");

    // Checando os arquivos
    if (!req.files) {
        return next(new ErrorHandler("Please upload your resume", 400));
    }

    const file = req.files.file;

    // Checando o tipo de arquivo
    const supportedFiles = /.pdf|.docx|.doc/;
    if (!supportedFiles.test(path.extname(file.name))) {
        return next(new ErrorHandler("Please upload a valid resume", 400));
    }

    // Checando o tamanho do arquivo
    if (file.size > process.env.MAX_FILE_SIZE) {
        return next(
            new ErrorHandler("Please upload a resume less than 5MB", 400)
        );
    }

    // Renomeando o arquivo
    file.name = `${req.user.name.replace(" ", "_")}_${job._id}${
        path.parse(file.name).ext
    }`;

    file.mv(`${process.env.UPLOAD_PATH}/${file.name}`, async (err) => {
        if (err) {
            console.log(err);
            return next(new ErrorHandler("Resume upload failed", 500));
        }

        await Job.findByIdAndUpdate(
            req.params.id,
            {
                $push: {
                    applicantsApplied: {
                        id: req.user._id,
                        resume: file.name
                    }
                }
            },
            {
                new: true,
                runValidators: true,
                useFindAndModify: false
            }
        );

        res.status(200).json({
            success: true,
            message: "Applied to job successfully",
            data: file.name
        });
    });
});
