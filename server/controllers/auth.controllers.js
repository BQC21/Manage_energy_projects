import bcrypt from "bcrypt"; // hashea y verifica contraseñas (proteccion al acceso no autorizado)
import { prisma } from "../db_client/prisma.js";

export const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const hashed = await bcrypt.hash(password, 8);
        const user = await prisma.user.create({
            data: { name, email, password: hashed },
        });
        res.success({ id: user.id, email: user.email }, "User registered", 201);
    } catch (err) {
        next(err);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(401).json({ message: "Invalid credentials" });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ message: "Invalid credentials" });

        req.session.user = { id: user.id, email: user.email };
        res.success({ id: user.id, email: user.email }, "Login successful");
    } catch (err) {
        next(err);
    }
};

// Cerrar sesión eliminando la sesión activa
export const logout = (req, res, next) => {
    try {
        req.session.destroy(err => {
            if (err) return next(err);
            res.clearCookie('connect.sid'); // nombre por defecto de cookie de sesión
            res.success(null, "Logout successful");
        });
    } catch (err) {
        next(err);
    }
};

export const me = async (req, res, next) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({ message: "Unauthorized: Please log in" });
        }
        res.success(req.session.user, "Session active");
    } catch (err) {
        next(err);
    }
};

// Validar que el correo existe para permitir actualización de contraseña
export const validation = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ message: "Email not found" });
        res.success({ email: user.email }, "Email validated");
    } catch (err) {
        next(err);
    }
};

// Actualizar contraseña tras validar correo
export const update_password = async (req, res, next) => {
    try {
        const { email, newPassword } = req.body;
        const hashed = await bcrypt.hash(newPassword, 8);
        await prisma.user.update({
            where: { email },
            data: { password: hashed },
        });
        res.success(null, "Password updated successfully");
    } catch (err) {
        next(err);
    }
};
