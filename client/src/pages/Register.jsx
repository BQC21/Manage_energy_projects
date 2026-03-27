import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Register = () => {
    const [userData, setuserData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
    setuserData({
        ...userData,
        [e.target.name]: e.target.value,
    });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate passwords match
        if (userData.password !== userData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (userData.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        const { confirmPassword: _confirmPassword, ...registerData } = userData;
        const result = await register(registerData);

        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }

        setLoading(false);
    };

    return (
    <div className="auth-container">
        <h2>Register</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
        <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
            type="text"
            id="name"
            name="name"
            value={userData.name}
            onChange={handleChange}
            required
            />
        </div>
        <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
            type="email"
            id="email"
            name="email"
            value={userData.email}
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
            value={userData.password}
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
            value={userData.confirmPassword}
            onChange={handleChange}
            required
            />
        </div>
        <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Registering...' : 'Registrar'}
        </button>
        </form>
        <div className="auth-link">
            <Link to="/login">Ya tengo una cuenta</Link>
        </div>
    </div>
    );
};

export default Register;