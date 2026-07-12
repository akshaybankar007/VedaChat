import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

const Chat = () => {
    const { user, logout } = useAuth();
    const socket = useSocket();

    return (
        <div style={{ padding: "2rem" }}>
            <h2>Welcome to the miserable world of WebSockets, {user?.username}</h2>
            <button onClick={logout}>Escape (Logout)</button>
            <p>Socket Status: {socket?.connected ? "Connected" : "Dead"}</p>
        </div>
    );
};

export default Chat;