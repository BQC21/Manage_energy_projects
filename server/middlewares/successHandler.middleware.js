export const successHandler = (req, res, next) => {
    res.success = (data, message = "OK", statusCode = 200) => {
    console.log(`[SUCCESS] ${req.method} ${req.url} → ${statusCode}: ${message}`);

    res.status(statusCode).json({
        success: true,
        statusCode,
        message,
        data,
    });
    };
    next();
};