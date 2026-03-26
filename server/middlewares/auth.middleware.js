export const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        // Usuario autenticado, continuar
        next();
    } else {
        // No autenticado, responder con error 401
        res.status(401).json({ message: "Unauthorized: Please log in" });
    }
};