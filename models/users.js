const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
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
});

// Encriptando a senha antes de salvar o usuario
userSchema.pre("save", async function (next) {
    this.password = await bcrypt.hash(this.password, 10);
});

// Retornando o JWT token
userSchema.methods.getJwtToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_TIME
    });
};

// Comparando a senha do usuario
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
