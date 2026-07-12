import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const Login = () => {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(identifier, password);
        } catch (err) {
            console.error("Login Error:", err);
            alert("Login failed. You probably forgot your own password.");
        }
    };

    return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
            <h2>Enter the Void</h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "300px", margin: "0 auto" }}>
                <input 
                    type="text" 
                    placeholder="Username, Email, or Phone" 
                    value={identifier} 
                    onChange={(e) => setIdentifier(e.target.value)} 
                    required 
                />
                <input 
                    type="password" 
                    placeholder="Password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                />
                <button type="submit">Login</button>
            </form>
            <p>Not a victim yet? <Link to="/register">Register here</Link></p>
        </div>
    );
};

export default Login;