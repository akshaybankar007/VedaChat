import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "./ToastContext";

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")) || null);
    const { showToast } = useToast();
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

    const logout = () => {
        localStorage.clear();
        setUser(null);
        window.location.href = "/login"; 
    };

    // Axios Interceptor to catch 401 Unauthorized globally
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response?.status === 401) {
                    showToast("Session expired. Please log in again.", "error");
                    logout();
                }
                return Promise.reject(error);
            }
        );
        return () => axios.interceptors.response.eject(interceptor);
    }, [showToast]);

    const login = async (identifier, password) => {
        const { data } = await axios.post(`${API_URL}/api/auth/login`, { identifier, password });
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        setUser(data.user);
    };

    const register = async (username, email, phone, password) => {
        const { data } = await axios.post(`${API_URL}/api/auth/register`, { username, email, phone, password });
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        setUser(data.user);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};