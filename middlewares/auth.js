const jwt = require("jsonwebtoken");
const User = require("../models/users");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("./catchAsyncErrors");

// Checando se o usuario está autenticado ou não
exports.isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return next(
            new ErrorHandler("Login first to access this resource", 401)
        );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    next();
});
