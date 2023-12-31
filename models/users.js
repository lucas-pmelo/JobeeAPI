const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Please enter your name"]
        },
        email: {
            type: String,
            required: [true, "Please enter your email"],
            unique: true,
            validate: [validator.isEmail, "Please enter a valid email address"]
        },
        role: {
            type: String,
            enum: {
                values: ["user", "employer"],
                message: "Please select correct role"
            },
            default: "user"
        },
        password: {
            type: String,
            required: [true, "Please enter your password"],
            minlength: [8, "Your password must be longer than 8 characters"],
            select: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        resetPasswordToken: String,
        resetPasswordExpire: Date
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Encriptando a senha antes de salvar o usuario
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        next();
    }

    this.password = await bcrypt.hash(this.password, 10);
});

// Retornando o JWT token
userSchema.methods.getJwtToken = function () {
    return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_TIME
    });
};

// Comparando a senha do usuario
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Gerando o password reset token
userSchema.methods.getResetPasswordToken = function () {
    // Gerando o token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Hashing e adicionando ao resetPasswordToken
    this.resetPasswordToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    // Definindo o tempo de expiração
    this.resetPasswordExpire = Date.now() + 30 * 60 * 1000;

    return resetToken;
};

// Mostrar todos os jobs criados pelo usuario usando virtuals
userSchema.virtual("jobsPublished", {
    ref: "Job",
    localField: "_id",
    foreignField: "user",
    justOne: false
});

module.exports = mongoose.model("User", userSchema);
