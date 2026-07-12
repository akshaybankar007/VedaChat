import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const Register = () => {
    const [formData, setFormData] = useState({ username: "", email: "", phone: "", password: "" });
    const { register } = useAuth();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await register(formData.username, formData.email, formData.phone, formData.password);
        } catch (err) {
            console.error("Register Error:", err);
            alert("Registration failed. Your data is probably garbage.");
        }
    };

    return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
            <h2>Join the Suffering</h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "300px", margin: "0 auto" }}>
                <input name="username" type="text" placeholder="Username" onChange={handleChange} required />
                <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
                <input name="phone" type="text" placeholder="Phone" onChange={handleChange} required />
                <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
                <button type="submit">Register</button>
            </form>
            <p>Already trapped? <Link to="/login">Login here</Link></p>
        </div>
    );
};

export default Register;