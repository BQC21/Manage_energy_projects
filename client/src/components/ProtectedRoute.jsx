import { Navigate } from 'react-router-dom';
import { user, loadingAuth } from '../context/AuthContext.jsx';

function ProtectedRoute({ children }) {
    if (loadingAuth) {
        return <div className="auth-container">Validando sesión...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;
