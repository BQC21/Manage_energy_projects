const API = "http://localhost:3000/api/projects";

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