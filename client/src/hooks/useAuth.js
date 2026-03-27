// ./client/src/hooks/useAuth.js
import { useState, useContext, createContext } from "react";
import {
    registerRequest,
    loginRequest,
    logoutRequest,
    validationRequest,
    updatePasswordRequest,
} from "../api/auth.api.js";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    // Registro
    const register = async (userData) => {
    try {
        const response = await registerRequest(userData);
        if (response.status === 201) {
            setUser(response.data);
            return { success: true };
        }
        return { success: false, error: response.data.message || "Error en registro" };
    } catch (error) {
        return { success: false, error: error.response?.data?.message || error.message };
    }
    };

    // Login
    const login = async (credentials) => {
    try {
        const response = await loginRequest(credentials);
        if (response.status === 200) {
            setUser(response.data);
            return { success: true };
        }
        return { success: false, error: response.data.message || "Error en login" };
    } catch (error) {
        return { success: false, error: error.response?.data?.message || error.message };
    }
    };

    // Logout
    const logout = async () => {
    try {
        await logoutRequest();
        setUser(null);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.response?.data?.message || error.message };
    }
    };

    // Validar email para recuperación
    const validation = async (data) => {
        try {
            const response = await validationRequest(data);
            if (response.status === 200) {
                return { success: true };
            }
            return { success: false, error: response.data.message || "Error en validación" };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || error.message };
        }
    };

    // Actualizar contraseña
    const update_password = async (data) => {
        try {
            const response = await updatePasswordRequest(data);
            if (response.status === 200) {
                return { success: true };
            }
            return { success: false, error: response.data.message || "Error al actualizar contraseña" };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || error.message };
        }
    };

    return (
    <AuthContext.Provider
        value={{ user, register, login, logout, 
            validation, update_password }}
    >
        {children}
    </AuthContext.Provider>
    );
};

// Hook para usar el contexto
export const useAuth = () => {
    return useContext(AuthContext);
};