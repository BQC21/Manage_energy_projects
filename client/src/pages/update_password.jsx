import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const UpdatePassword = () => {
    const [data, setData] = useState({
        email: '',
        newPassword: '',
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { update_password } = useAuth();
    const navigate = useNavigate();

    // cambiar valores
    const handleChange = (e) => {
        setData({
            ...data,
            [e.target.name]: e.target.value,
        });
    };

    // click en Verificar
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validate passwords match
        if (data.newPassword !== data.confirmNewPassword) {
            setError('Passwords do not match');
            return;
        }
        if (data.newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        const result = await update_password(data);

        if (result.success) {
            navigate('/login');
        } else {
            setError(result.error);
        }

        setLoading(false);
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
                name="password"
                value={data.password}
                onChange={handleChange}
                required
                />
            </div>
            <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={data.confirmPassword}
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