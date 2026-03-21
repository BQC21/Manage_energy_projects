import { prisma } from "../db_client/prisma.js";

// POST /api/upload_excel
export const uploadExcel = async (req, res, next) => {
    if (!req.file) {
        const err = new Error("No file uploaded");
        err.statusCode = 400;
        return next(err);
    }

    try {
        // Extract project ID from query params or form data
        const projectId = req.body.projectId || req.query.projectId;
        
        if (!projectId) {
            const err = new Error("projectId is required");
            err.statusCode = 400;
            return next(err);
        }

        const parsedProjectId = parseInt(projectId);
        if (isNaN(parsedProjectId)) {
            const err = new Error("Invalid projectId: must be an integer");
            err.statusCode = 400;
            return next(err);
        }

        // Verify project exists
        const project = await prisma.project.findUnique({
            where: { id: parsedProjectId }
        });

        if (!project) {
            const err = new Error("Project not found");
            err.statusCode = 404;
            return next(err);
        }

        // Save file path to project
        const filePath = req.file.path;
        const updatedProject = await prisma.project.update({
            where: { id: parsedProjectId },
            data: { excel_file_path: filePath }
        });

        res.success(
            { project: updatedProject, file: req.file.filename },
            "Excel file uploaded successfully"
        );
    } catch (err) {
        next(err);
    }
};
