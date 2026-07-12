import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

    useEffect(() => {
        if (!user) {
            if (socket) socket.close();
            return;
        }

        const token = localStorage.getItem("token");
        const newSocket = io(API_URL, {
            auth: { token },
            withCredentials: true,
        });
        
        newSocket.on("connect", () => setSocket(newSocket));
        newSocket.on("connect_error", (err) => console.error("Socket rejected:", err.message));
        
        return () => newSocket.close();
    }, [user]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};