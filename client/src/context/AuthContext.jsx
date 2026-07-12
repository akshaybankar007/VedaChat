import { createContext, useContext, useState } from "react";
import axios from "axios";

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")) || null);

    const login = async (identifier, password) => {
        const { data } = await axios.post("http://localhost:5000/api/auth/login", { identifier, password });
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        setUser(data.user);
    };

    const register = async (username, email, phone, password) => {
        const { data } = await axios.post("http://localhost:5000/api/auth/register", { username, email, phone, password });
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        setUser(data.user);
    };

    const logout = () => {
        localStorage.clear();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};