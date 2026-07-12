export const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
    let message = err.message || "The server threw up and gave up.";

    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(val => val.message);
        message = errors.join(', ');
        statusCode = 400;
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        message = `That ${field} is already taken. Be original.`;
        statusCode = 400;
    }

    // Logic 7: Catch bad ObjectIds globally (e.g. invalid cursor, invalid user params)
    if (err.name === 'CastError') {
        message = `Resource not found. Invalid ${err.path}: ${err.value}`;
        statusCode = 400;
    }

    console.error(`[Error]: ${message}`);
    
    res.status(statusCode).json({
        success: false,
        message,
        stack: process.env.NODE_ENV === "production" ? "classified" : err.stack,
    });
};