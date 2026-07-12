import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const Register = () => {
    const [formData, setFormData] = useState({ username: "", email: "", phone: "", password: "" });
    const { register } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await register(formData.username, formData.email, formData.phone, formData.password);
        } catch (err) {
            console.error("Register Error:", err);
            alert("Registration failed. Data rejected.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2 className="auth-title">VedaChat</h2>
                <form onSubmit={handleSubmit} className="auth-form">
                    <input className="auth-input" name="username" type="text" placeholder="Username" onChange={handleChange} required />
                    <input className="auth-input" name="email" type="email" placeholder="Email" onChange={handleChange} required />
                    <input className="auth-input" name="phone" type="text" placeholder="Phone" onChange={handleChange} required />
                    <input className="auth-input" name="password" type="password" placeholder="Password" onChange={handleChange} required />
                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? "Forging Identity..." : "Sign Up"}
                    </button>
                </form>
                <p className="auth-link">
                    Already have an account? <Link to="/login">Log In</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;