import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Link } from "react-router-dom";

const Login = () => {
    const [formData, setFormData] = useState({ identifier: "", password: "" });
    const { login } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(formData.identifier, formData.password);
        } catch (err) {
            const backendError = err.response?.data?.message || err.message || "Authentication failed.";
            showToast(backendError, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2 className="auth-title">VedaChat</h2>
                <form onSubmit={handleSubmit} className="auth-form">
                    <input className="auth-input" name="identifier" type="text" placeholder="Username, Email, or Phone" onChange={handleChange} required />
                    <input className="auth-input" name="password" type="password" placeholder="Password" onChange={handleChange} minLength={6} required />
                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? "Connecting..." : "Log In"}
                    </button>
                </form>
                <p className="auth-link">
                    Don't have an account? <Link to="/register">Sign up</Link>
                </p>
            </div>
        </div>
    );
};
export default Login;