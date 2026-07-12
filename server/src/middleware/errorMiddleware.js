export const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    
    console.error(`[Error]: ${err.message}`);
    
    res.status(statusCode).json({
        success: false,
        message: err.message || "The server threw up and gave up.",
        stack: process.env.NODE_ENV === "production" ? "classified" : err.stack,
    });
};