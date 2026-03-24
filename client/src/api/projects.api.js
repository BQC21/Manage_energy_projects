const SERVER_BASE = import.meta.env.VITE_SERVER_API_URL || "http://localhost:3000";
const API = `${SERVER_BASE}/api/projects`;

/////////////////////////////

export const getProjectsRequest  = ()         => fetch(API);

export const getProjectRequest   = (id)       => fetch(`${API}/${id}`);

export const createProjectRequest = (project) =>
    fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
});

export const updateProjectRequest = (id, project) =>
    fetch(`${API}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
    });

export const deleteProjectRequest = (id) =>
    fetch(`${API}/${id}`, { 
        method: "DELETE" 
});