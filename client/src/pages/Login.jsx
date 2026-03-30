import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';

const Login = () => {
    const [credentials, setCredentials] = useState({
        email: '',
        password: '',
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    // cambiar valores
    const handleChange = (e) => {
        setCredentials({
            ...credentials,
            [e.target.name]: e.target.value,
        });
    };

    // click en Ingresar
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await AuthProvider.login(credentials);
            if (result.success) {
                navigate('/');
            } else {
                setError(result.error || 'Login failed');
            }
        } catch (err) {
            setError(err.message || 'Unexpected error');
        } finally {
            setLoading(false);
        }
    };


    return (
    <div className="auth-container">
        <h2>Ingresar Usuario</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                type="email"
                id="email"
                name="email"
                value={credentials.email}
                onChange={handleChange}
                required
                />
            </div>
            <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                type="password"
                id="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                required
                />
            </div>
            <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Logging in...' : 'Ingresar'}
            </button>
        </form>
        <div className="auth-link">
            <Link to="/validation">Olvidé mi contraseña</Link>
        </div>
        <div className="auth-link">
            ¿No tienes una cuenta? <Link to="/register">Regístrate aquí</Link>
        </div>
    </div>
    );
};

export default Login;