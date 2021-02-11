const AppError = require('../utils/appError');


const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
};

const handleValidationError = () => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
}

const handleDuplicateError = () => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    const message = `Duplicate field value: ${value}. Please use another value!`;
    new AppError(message, value);
}

const handleJWTError = () => {
    new AppError('Your JWT Token is invalid,Please login again', 401);
}

const handleJWTExpireError = () => {
    new AppError('Your JWT Token has expired,Please login again', 401);
}

// Development 
const sendErrorDev = (err, req, res) => {
    // api
    if (req.originalUrl.startsWith('/api')) {
        return res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        })
    }

    return res.status(err.statusCode).json({
        title: 'Something Went Wrong',
        msg: err.message,
        err:err,
        stack:err.stack
    })
}


//   Production
const sendErrorProd = (err, req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message,
            })
        }
        return res.status(500).json({
            status: 'error',
            message: 'Something went wrong'
        })
    }

    if (err.isOperational) {
        return res.status(err.statusCode).render('error', {
            title: 'Something went wrong!',
            msg: err.message
        });
    }

    return res.status(err.statusCode).json({
        title: 'Something went wrong!',
        msg: 'Please try again later.'
    });
}

// Export
module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res);
    }
    else if (process.env.NODE_ENV === 'production') {
        let error = { ...err };
        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.name === 'ValidationError') error = handleValidationError();
        if (error.code === 1100) error = handleDuplicateError();
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpireError();

        sendErrorProd(error, req, res);
    }
}