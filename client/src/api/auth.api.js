import axios from "axios";

// Configuración base de Axios
const authApi = axios.create({
    baseURL: `${import.meta.env.VITE_SERVER_API_URL || "http://localhost:3000"}/api/auth`,
    withCredentials: true, // OBLIGATORIO para enviar/recibir cookies de sesión
});

/**
 * Registro de nuevo usuario
 * @param {Object} userData - { name, email, password }
 */
export const registerRequest = async (userData) => {
    return await authApi.post("/register", userData);
};

/**
 * Inicio de sesión
 * @param {Object} credentials - { email, password }
 */
export const loginRequest = async (credentials) => {
    return await authApi.post("/login", credentials);
};

/**
 * Cierre de sesión
 */
export const logoutRequest = async () => {
    return await authApi.post("/logout");
};

export const meRequest = async () => {
    return await authApi.get("/me");
};

/**
 * Validación de existencia de correo para recuperación
 * @param {Object} data - { email }
 */
export const validationRequest = async (data) => {
    return await authApi.post("/validation", data);
};

/**
 * Actualización de contraseña
 * @param {Object} data - { email, newPassword }
 */
export const updatePasswordRequest = async (data) => {
    return await authApi.post("/update_password", data);
};

export default authApi;
