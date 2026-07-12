import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const Login = () => {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(identifier, password);
        } catch (err) {
            console.error("Login Error:", err);
            const backendError = err.response?.data?.message || err.message || "Heartbreak. Authentication failed.";
            alert(`Access Denied: ${backendError}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2 className="auth-title">VedaChat 💌</h2>
                <form onSubmit={handleSubmit} className="auth-form">
                    <input 
                        className="auth-input"
                        type="text" 
                        placeholder="Username, Email, or Phone" 
                        value={identifier} 
                        onChange={(e) => setIdentifier(e.target.value)} 
                        required 
                    />
                    <input 
                        className="auth-input"
                        type="password" 
                        placeholder="Password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                    />
                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? "Connecting Hearts..." : "Log In 💖"}
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