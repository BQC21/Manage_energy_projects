import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";

import projectRoutes from "./routes/projects.routes.js";
import authRoutes from "./routes/auth.routes.js";

import { isAuthenticated } from "./middlewares/auth.middleware.js";
import { logger } from "./middlewares/logger.middleware.js";
import { successHandler } from "./middlewares/successHandler.middleware.js";
import { notFound } from "./middlewares/notFound.middleware.js";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";

const app = express();

app.use(session({
    secret: process.env.SESSION_SECRET || 'tu_clave_secreta_aqui', // Usa .env
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Ponlo en true solo si usas HTTPS
        httpOnly: true, 
        maxAge: 24 * 60 * 60 * 1000 // 1 día de duración
    }
}))

// Port
const port = process.env.PORT || 3000;

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
}));
app.use(express.json());

// global middlewares 
app.use(logger);          
app.use(successHandler);              

// RUTAS

// 1. Rutas Públicas (Login, Register, etc.)
app.use("/api/auth", authRoutes);

// Aplicamos el middleware solo a estas rutas
app.use("/api", isAuthenticated, projectRoutes);

// middlewares for error management
app.use(notFound);       
app.use(errorHandler);    

// start server
app.listen(port, () => {
    console.log(`Server on port ${port}`);
});
