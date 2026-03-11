import { prisma } from "../db_client/prisma.js";

const REQUIRED_FIELDS = ["project", "Energy_kwh", "Price", "Nro_panels", "status"];

function validateProjectBody(body) {
    const missing = REQUIRED_FIELDS.filter((f) => body[f] === undefined || body[f] === "");
    if (missing.length > 0) {
        const err = new Error(`Missing required fields: ${missing.join(", ")}`);
        err.statusCode = 400;
        return err;
    }

    if (typeof body.Energy_kwh !== "number" || body.Energy_kwh < 0) {
        const err = new Error("Energy_kwh must be a positive number");
        err.statusCode = 400;
        return err;
    }
    if (typeof body.Price !== "number" || body.Price < 0) {
        const err = new Error("Price must be a positive number");
        err.statusCode = 400;
        return err;
    }
    if (!Number.isInteger(body.Nro_panels) || body.Nro_panels < 0) {
        const err = new Error("Nro_panels must be a positive integer");
        err.statusCode = 400;
        return err;
    }

    return null; // success
}

// ── POST /api/projects ───────────────────────────────────────────────────────
export const createProject = async (req, res, next) => {
    const validationError = validateProjectBody(req.body);
    if (validationError) return next(validationError);

    try {
        const project = await prisma.project.create({ data: req.body });
        res.success(project, "Project created", 201);
    } catch (err) {
        next(err);
    }
};

// GET
export const getProjects = async (req, res, next) => {
    try {
        const projects = await prisma.project.findMany();
        res.success(projects, "Projects retrieved");
    } catch (err) {
        next(err);
    }
};

export const getProject = async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        const err = new Error("Invalid id: must be an integer");
        err.statusCode = 400;
        return next(err);
    }    

    try {
        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) {
            const err = new Error("Project not found");
            err.statusCode = 404;
            return next(err);
        }
        res.success(project, "Project retrieved");
    } catch (err) {
        next(err);
    }
};

// PUT
export const updateProject = async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        const err = new Error("Invalid id: must be an integer");
        err.statusCode = 400;
        return next(err);
    }

    const validationError = validateProjectBody(req.body);
    if (validationError) return next(validationError);

    try {
        const project = await prisma.project.update({ where: { id }, data: req.body });
        res.success(project, "Project updated");
    } catch (err) {
        next(err);
    }
};

// DELETE
export const deleteProject = async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        const err = new Error("Invalid id: must be an integer");
        err.statusCode = 400;
        return next(err);
    }

    try {
        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) {
            const err = new Error("Project not found");
            err.statusCode = 404;
            return next(err);
        }
        await prisma.project.delete({ where: { id } });
        res.success(null, "Project deleted");
    } catch (err) {
        next(err);
    }
};