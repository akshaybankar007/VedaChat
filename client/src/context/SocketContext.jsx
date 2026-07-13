import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

    const userId = user?._id || user?.id; 

    useEffect(() => {
        if (!userId) {
            setSocket((prevSocket) => {
                if (prevSocket) {
                    prevSocket.removeAllListeners();
                    prevSocket.close();
                }
                return null;
            });
            return;
        }

        const token = localStorage.getItem("token");
        const newSocket = io(API_URL, {
            auth: { token },
            withCredentials: true,
        });
        
        newSocket.on("connect", () => {
            setSocket(newSocket);
            newSocket.emit("user_join");
        });
        
        newSocket.on("connect_error", (err) => console.error("Socket rejected:", err.message));
        
        newSocket.on("disconnect", (reason) => {
            if (reason === "io server disconnect") {
                newSocket.connect();
            }
        });
        
        return () => {
            newSocket.removeAllListeners();
            newSocket.close();
        };
    }, [userId, API_URL]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};