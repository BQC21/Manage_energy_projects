import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "../components/navbar";
import CRUD from "../components/CRUD";
import TEC_logo from "../assets/TEC_logo.png";
import { meRequest } from "../api/auth.api.js";

function Home() {
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await meRequest();
                setIsAuthenticated(res.status === 200 && Boolean(res.data?.data));
            } catch (_error) {
                setIsAuthenticated(false);
            } finally {
                setLoadingAuth(false);
            }
        };

        checkAuth();
    }, []);

    if (loadingAuth) {
        return <div className="auth-container">Validando sesión...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div>
            <Navbar />
            <main>
                <section className="hero-card">
                    <div className="hero-content">
                        <div className="col-md-10 align-self-end justify-content">
                            <h1>Gestor de proyecto elaborados con sistemas solares fotovoltaicos</h1>
                        </div>
                        <div className="col-md-12 align-self-end justify-content" >
                            <span><img src={TEC_logo} alt="Logo TEC" className="hero-logo" /></span>
                        </div>
                    </div>
                </section>
                <CRUD />
            </main>
        </div>
    );
}

export default Home; 
