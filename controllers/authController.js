const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const UserModel = require('../models/userModel');
const jwt = require('jsonwebtoken');
const { exists } = require('../models/userModel');
const User = require('../models/userModel');
const { promisify } = require('util');
const Email = require('../utils/email');
const { encrypt } = require('../utils/cryption');
const crypto = require('crypto');

const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
}

const verifyTokenUser = async (code, email) => {
    const data = `${code} ${email}`;
    const encryptedCode = JSON.stringify(encrypt(data));
    return await User.findOne({
        passwordResetToken: encryptedCode,
        passwordResetExpires: { $gt: Date.now() }
    });

}
const createSendToken = (user, statusCode, req, res) => {
    const token = signToken(user._id);
    res.cookie('jwt', token, {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 1000 * 60 * 60 * 24
        ),
        httpOnly: true,
    });
    // req.userId = user._id ;
    // res.locals.token = token;
    user.password = undefined;
    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
}
exports.signup = catchAsync(async (req, res, next) => {
    // if email already exist 
    const user = await User.findOne({ email: req.body.email });
    if (user) return next(new AppError('This email already exist', 401));
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm
    });
    const token = await newUser.createPasswordResetToken();
    await newUser.save({ validateBeforeSave: false });
    try {
        await new Email(newUser, token).VerifyAccount();
        res.status(200).json({
            status: 'success',
            message: `A email sent to your email ${newUser.email}`
        });
    } catch (error) {
        newUser.passwordResetToken = undefined;
        newUser.passwordResetExpires = undefined;

        await newUser.save({ validateBeforeSave: false });

        return next(new AppError('Failed in sending email,Try again..', 500));
    }

});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    // console.log(email);
    // console.log(password);
    // check if email or password not provided
    if (!email || !password) return next(new AppError('Provide email and password', 401));

    const myUser = await UserModel.findOne({ email }).select('+password');
    if (!myUser || !(await myUser.correctPassword(password, myUser.password))) {
        return next(new AppError('Incorrect email or password', 401));
    }
    // console.log(`sending response`);
    createSendToken(myUser, 200, req, res);
});

exports.logout = (req, res, next) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(
            Date.now() * 1 * 1000
        ),
        httpOnly: true,
    });

    res.status(200).json({
        status: 'success'
    });
}

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on POSTed email
    const user = await UserModel.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError('There is no user with email address.', 404));
    }

    // 2) Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // 3) Send it to user's email
    try {
        // const resetURL = `${req.protocol}://${req.get(
        //     'host'
        // )}/api/v1/users/resetPassword/${resetToken}`;
        await new Email(user, resetToken).sendPasswordReset();

        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!',
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(
            new AppError('There was an error sending the email. Try again later!'),
            500
        );
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    if (!req.body.code || !req.body.password || !req.body.passwordConfirm) {
        return next(new AppError('Provide otp code,password or password Confirm to proceed', 401));
    }
    const user = await verifyTokenUser(req.body.code, req.params.email);
    console.log(user);
    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
        return next(new AppError('Otp Code is invalid or has expired', 400));
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.accountVerify = true;
    await user.save({ validateBeforeSave: false });

    // 3) Update changedPasswordAt property for the user
    // 4) Log the user in, send JWT
    createSendToken(user, 200, req, res);
});


exports.VerifyAccount = catchAsync(async (req, res, next) => {
    if (!req.body.code) return next(new AppError('code is not provided', 401));
    const user = await verifyTokenUser(req.body.code);
    // console.log(user);
    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
        return next(new AppError('Otp Code is invalid or has expired', 400));
    }
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.accountVerify = true;
    await user.save({ validateBeforeSave: false });
    console.log('your account is verified');
    // 3) Update changedPasswordAt property for the user
    // 4) Log the user in, send JWT
    createSendToken(user, 200, req, res);
});


exports.protect = catchAsync(async (req, res, next) => {
    // 1) Getting token and check of it's there
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return next(
            new AppError('You are not logged in! Please log in to get access.', 401)
        );
    }

    // 2) Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(
            new AppError(
                'The user belonging to this token does no longer exist.',
                401
            )
        );
    }

    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
            new AppError('User recently changed password! Please log in again.', 401)
        );
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
});

exports.isLogin = (req, res) => {
    res.status(200).json({
        status: 'success'
    });
}