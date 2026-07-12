import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        // Prevent rogue connections from unauthenticated ghosts
        if (!user) {
            if (socket) socket.close();
            return;
        }

        const token = localStorage.getItem("token");
        const newSocket = io("http://localhost:5000", {
            auth: { token },
            withCredentials: true,
        });
        
        newSocket.on("connect", () => {
            setSocket(newSocket);
        });

        newSocket.on("connect_error", (err) => {
            console.error("Socket authentication rejected:", err.message);
        });
        
        return () => newSocket.close();
    }, [user]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};