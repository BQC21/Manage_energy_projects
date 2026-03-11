export const logger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[LOG] ${timestamp} → ${req.method} ${req.url}`);
    next();
};