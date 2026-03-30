import { createContext, useContext, useEffect, useState } from 'react';
import {
    registerRequest,
    loginRequest,
    logoutRequest,
    meRequest,
    validationRequest,
    updatePasswordRequest,
} from '../api/auth.api.js';

export const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await meRequest();
                if (res.status === 200 && res.data?.data) {
                    setUser(res.data.data);
                } else {
                    setUser(null);
                }
            } catch (_err) {
                setUser(null);
            } finally {
                setLoadingAuth(false);
            }
        };

        checkAuth();
    }, []);

    const register = async (userData) => {
        setLoadingAuth(true);
        try {
            const res = await registerRequest(userData);
            if (res.status === 201) {
                return { success: true };
            }
            return { success: false, error: res.data?.message || 'Registro fallido' };
        } catch (_err) {
            return { success: false, error: _err?.response?.data?.message || _err?.message || 'Error desconocido' };
        } finally {
            setLoadingAuth(false);
        }
    };

    const login = async (credentials) => {
        setLoadingAuth(true);
        try {
            const res = await loginRequest(credentials);
            if (res.status === 200) {
                if (res.data?.data) setUser(res.data.data);
                else setUser({ email: credentials.email });
                return { success: true };
            }
            return { success: false, error: res.data?.message || 'Login fallido' };
        } catch (err) {
            return { success: false, error: err?.response?.data?.message || err?.message || 'Error desconocido' };
        } finally {
            setLoadingAuth(false);
        }
    };

    const logout = async () => {
        setLoadingAuth(true);
        try {
            const res = await logoutRequest();
            if (res.status === 200) {
                setUser(null);
                return { success: true };
            }
            return { success: false, error: res.data?.message || 'Logout fallido' };
        } catch (err) {
            return { success: false, error: err?.response?.data?.message || err?.message || 'Error desconocido' };
        } finally {
            setLoadingAuth(false);
        }
    };

    const validation = async (data) => {
        try {
            const res = await validationRequest(data);
            if (res.status === 200) return { success: true };
            return { success: false, error: res.data?.message || 'Validación fallida' };
        } catch (err) {
            return { success: false, error: err?.response?.data?.message || err?.message || 'Error desconocido' };
        }
    };

    const update_password = async (data) => {
        try {
            const res = await updatePasswordRequest(data);
            if (res.status === 200) return { success: true };
            return { success: false, error: res.data?.message || 'Actualización fallida' };
        } catch (err) {
            return { success: false, error: err?.response?.data?.message || err?.message || 'Error desconocido' };
        }
    };

    return (
        <AuthContext.Provider
            value={{ user, loadingAuth, register, 
                login, logout, validation, update_password }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
