const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { generate } = require('../utils/otpGenerater');
const { encrypt } = require('../utils/cryption');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter your name']
    },
    email: {
        type: String,
        required: [true, 'Please enter your email'],
        unique: true,
        lowercase: true,
        validate: [
            validator.isEmail,
            'Please Provide a valid Email'
        ]
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Please provide the password'],
        minlength: 6,
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            validator: function (val) {
                return val === this.password;
            },
            messsage: 'Password are not the same'
        }
    },
    accountVerify: {
        type: Boolean,
        default: false,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    }
})

userSchema.methods.createPasswordResetToken = function (email) {
    const resetToken = generate(8);
    const data = `${resetToken} ${email}`;
    this.passwordResetToken = JSON.stringify(encrypt(data));
    this.passwordResetExpires = Date.now() + 10 * 1000 * 60
    return resetToken;
}
userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next();

    this.passwordChangedAt = Date.now() - 1000;
    next();
})
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
    next();
});
userSchema.pre(/^find/, function (next) {
    // this points to the current query
    this.find({ active: { $ne: false } });
    next();
});
userSchema.methods.correctPassword = async function (candidatePass, userPass) {
    return await bcrypt.compare(candidatePass, userPass);
};
userSchema.methods.changedPasswordAfter = function (jwtTimeStamp) {
    if (this.changedPasswordAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        );
        return jwtTimeStamp < changedPasswordAfter;
    }
    return false;
}

const User = mongoose.model('User', userSchema);
module.exports = User;