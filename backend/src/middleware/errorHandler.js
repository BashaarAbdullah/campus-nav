// backend/src/middleware/errorHandler.js
// Central error-handling middleware – catches and formats all errors consistently

const { NODE_ENV } = process.env;

// Custom error class for operational errors
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Not found handler (404)
const notFound = (req, res, next) => {
  const error = new AppError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern)[0];
    message = `Duplicate value for ${field}. Please use a unique value.`;
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired. Please log in again.';
  }

  // Multer errors
  if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === 'FILE_TOO_LARGE') {
      message = 'File too large. Maximum size is 5MB.';
    } else {
      message = err.message;
    }
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    message,
    // Include stack trace only in development
    ...(NODE_ENV === 'development' && { stack: err.stack }),
    // Include error details if available
    ...(err.errors && { details: err.errors }),
  });
};

module.exports = {
  AppError,
  notFound,
  errorHandler,
};