import { Router } from "express";

const router = Router();

// CRUD operations for projects
import { getProjects, 
    getProject, 
    createProject, 
    updateProject, 
    deleteProject } from "../controllers/projects.controller.js";

router.get("/projects", getProjects);
router.get("/projects/:id", getProject);
router.post("/projects", createProject);
router.put("/projects/:id", updateProject);
router.delete("/projects/:id", deleteProject);

export default router;