import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "./ToastContext";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem("user");
            return saved ? JSON.parse(saved) : null;
        } catch (err) {
            return null;
        }
    });
    
    const { showToast } = useToast();
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

    const logout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        setUser(null);
        // App.jsx will natively handle redirecting to /login via React Router SPA functionality
    };

    // Axios Interceptors for Auth Headers & 401 Handling
    useEffect(() => {
        const reqInterceptor = axios.interceptors.request.use(config => {
            const token = localStorage.getItem("token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        const resInterceptor = axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response?.status === 401) {
                    showToast("Session expired. Please log in again.", "error");
                    logout();
                }
                return Promise.reject(error);
            }
        );
        
        return () => {
            axios.interceptors.request.eject(reqInterceptor);
            axios.interceptors.response.eject(resInterceptor);
        };
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