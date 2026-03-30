import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';

const Validation = () => {
    const [data, setData] = useState({
        email: '',
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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

        try {
            const result = await AuthProvider.validation(data);
            if (result.success) {
                // pasar email al formulario de actualización
                navigate('/update_password', { state: { email: data.email } });
            } else {
                setError(result.error || 'Validation failed');
            }
        } catch (err) {
            setError(err.message || 'Unexpected error');
        } finally {
            setLoading(false);
        }
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