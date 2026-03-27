import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Validation = () => {
    const [data, setData] = useState({
        email: '',
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { validation } = useAuth();
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

        if (!data.email) {
            setError('Email is required');
            setLoading(false);
            return;
        }
        // verificar si el usuario existe para permitir actualización de contraseña
        // ...... Escribir lógica de validación aquí ......

        const result = await validation(data);

        if (result.success) {
            navigate('/update_password');
        } else {
            setError(result.error);
        }

        setLoading(false);
    };

    return (
    <div className="auth-container">
        <h2>Verificar Usuario</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                type="email"
                id="email"
                name="email"
                value={data.email}
                onChange={handleChange}
                required
                />
            </div>
            <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Verifying...' : 'Verificar'}
            </button>
        </form>
        <div className="auth-link">
            <Link to="/login">Atrás</Link>
        </div>
    </div>
    );
};

export default Validation;