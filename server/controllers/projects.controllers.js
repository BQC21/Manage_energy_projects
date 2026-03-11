import { prisma } from "../db_client/prisma.js";

// POST
export const createProject = async (req, res, next) => {
    try {
        const newProject = req.body;
        const project = await prisma.project.create({ data: newProject });
        res.success(project, "Project created");
    } catch (err) {
        next(err);
    }
};

// GET
export const getProjects = async (req, res, next) => {
    try {
        const projects = await prisma.project.findMany();
        res.success(projects, "Projects retrieved");    
    } catch(err){
        next(err);
    }
};

export const getProject = async (req, res, next) => {
    const { id } = req.params;
    try {
        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        res.success(project, "Project retrieved");
    } catch (err) {
        next(err);
    }
};

// PUT
export const updateProject = async (req, res, next) => {
    const { id } = req.params;
    const newProject = req.body;
    try {
        const project = await prisma.project.update({ where: { id }, data: newProject });
        res.success(project, "Project updated");
    } catch (err) {
        next(err);
    }
    };

// DELETE
export const deleteProject = async (req, res, next) => {
    const { id } = req.params;
    try {
        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        await prisma.project.delete({ where: { id } });
        res.success(null, "Project deleted");
    } catch (err) {
        next(err);
    }
};