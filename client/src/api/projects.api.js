const SERVER_BASE = import.meta.env.VITE_SERVER_API_URL || "http://localhost:3000";
const API = `${SERVER_BASE}/api/projects`;

const PYTHON_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const REPORTS_API = `${PYTHON_BASE}/api/reports`;

export const getProjectsRequest = () => fetch(API, { credentials: "include" });

export const getProjectRequest = (id) => fetch(`${API}/${id}`, { credentials: "include" });

export const createProjectRequest = (project) =>
    fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(project),
    });

export const updateProjectRequest = (id, project) =>
    fetch(`${API}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(project),
    });

export const deleteProjectRequest = (id) =>
    fetch(`${API}/${id}`, {
        method: "DELETE",
        credentials: "include",
    });

// ----------- Python API Requests -----------

export const processProjectRequest = (formData) =>
    fetch(`${REPORTS_API}/process-project`, {
        method: "POST",
        body: formData,
    });

export const downloadExcelRequest = (projectId) =>
    fetch(`${REPORTS_API}/download-excel?project_id=${projectId}`, {
        method: "GET",
    });

export const generateQuotePdfRequest = (formData) =>
    fetch(`${REPORTS_API}/quote`, {
        method: "POST",
        body: formData,
    });

export const generateFinancialPdfRequest = (formData) =>
    fetch(`${REPORTS_API}/financial`, {
        method: "POST",
        body: formData,
    });
