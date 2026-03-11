export const notFound = (req, res, next) => {
    const error = new Error(`Route not found: ${req.method} ${req.url}`);
    error.statusCode = 404;
    next(error); // lo pasa al errorHandler
};