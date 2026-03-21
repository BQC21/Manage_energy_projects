import { Router } from "express";

const router = Router();

// CRUD operations for projects
import { getProjects, 
    getProject, 
    createProject, 
    updateProject, 
    deleteProject } from "../controllers/projects.controllers.js";

import { uploadExcel } from "../controllers/upload.controllers.js";

// Multer middleware
import multer from "multer";
const upload = multer({ dest: "uploads/" });

router.get("/projects", getProjects);
router.get("/projects/:id", getProject);
router.post("/projects", createProject);
router.put("/projects/:id", updateProject);
router.delete("/projects/:id", deleteProject);

// File upload
router.post("/upload_excel", upload.single("file"), uploadExcel);

export default router;