import "dotenv/config";
import express from "express";
import cors from "cors";

import projectRoutes from "./routes/projects.routes.js";

import { logger } from "./middlewares/logger.middleware.js";
import { successHandler } from "./middlewares/successHandler.middleware.js";
import { notFound } from "./middlewares/notFound.middleware.js";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";

const app = express();

// Port
const port = process.env.PORT || 3000;

// global middlewares 
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());
app.use(logger);          
app.use(successHandler);              

// routes
app.use("/api", projectRoutes);                

// middlewares for error management
app.use(notFound);       
app.use(errorHandler);    

// start server
app.listen(port);
console.log(`server on port ${port}`);