import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';

const UpdatePassword = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    const [data, setData] = useState({
        email: '',
        newPassword: '',
        confirmNewPassword: '',
    });

    useEffect(() => {
        if (location.state?.email) {
            setData((d) => ({ ...d, email: location.state.email }));
        }
    }, [location.state?.email]);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // cambiar valores
    const handleChange = (e) => {
        setData({
            ...data,
            [e.target.name]: e.target.value,
        });
    };

    // click en Actualizar
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validate passwords match
        if (data.newPassword !== data.confirmNewPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }
        if (data.newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            setLoading(false);
            return;
        }

        try {
            const payload = { email: data.email, newPassword: data.newPassword };
            const result = await AuthProvider.update_password(payload);
            if (result.success) {
                navigate('/login');
            } else {
                setError(result.error || 'Update failed');
            }
        } catch (err) {
            setError(err.message || 'Unexpected error');
        } finally {
            setLoading(false);
        }
    };

    return (
    <div className="auth-container">
        <h2>Actualizar Contraseña</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                type="password"
                id="password"
                name="newPassword"
                value={data.newPassword}
                onChange={handleChange}
                required
                />
            </div>
            <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                type="password"
                id="confirmPassword"
                name="confirmNewPassword"
                value={data.confirmNewPassword}
                onChange={handleChange}
                required
                />
            </div>
            <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Actualizando...' : 'Actualizar'}
            </button>
        </form>
        <div className="auth-link">
            <Link to="/login">Atrás</Link>
        </div>
    </div>
    );
};

export default UpdatePassword;