import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";

const Chat = () => {
    const { user, logout } = useAuth();
    const socket = useSocket();
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [typingUsers, setTypingUsers] = useState([]);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const token = localStorage.getItem("token");
                const headers = { Authorization: `Bearer ${token}` };
                
                const [msgRes, usersRes] = await Promise.all([
                    axios.get("http://localhost:5000/api/messages", { headers }),
                    axios.get("http://localhost:5000/api/users", { headers })
                ]);
                
                setMessages(msgRes.data.messages);
                setUsers(usersRes.data.users);
            } catch (err) {
                console.error("Failed to load initial data. The database is likely suffering.", err);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (!socket || !user) return;

        socket.emit("user_join");

        const handleReceive = (message) => setMessages((prev) => [...prev, message]);
        
        const handleUserStatus = ({ userId, isOnline }) => {
            setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isOnline } : u));
        };

        const handleTyping = (username) => {
            setTypingUsers((prev) => prev.includes(username) ? prev : [...prev, username]);
        };

        const handleStopTyping = (username) => {
            setTypingUsers((prev) => prev.filter((u) => u !== username));
        };

        socket.on("receive_message", handleReceive);
        socket.on("user_status", handleUserStatus);
        socket.on("user_typing", handleTyping);
        socket.on("user_stop_typing", handleStopTyping);

        return () => {
            socket.off("receive_message", handleReceive);
            socket.off("user_status", handleUserStatus);
            socket.off("user_typing", handleTyping);
            socket.off("user_stop_typing", handleStopTyping);
        };
    }, [socket, user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, typingUsers]);

    const handleInputChange = (e) => {
        setNewMessage(e.target.value);
        if (!socket || !user) return;

        socket.emit("typing", user.username);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit("stop_typing", user.username);
        }, 2000);
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        // Removing senderId. The server verifies identity now.
        socket.emit("send_message", { text: newMessage });
        socket.emit("stop_typing", user.username);
        setNewMessage("");
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };

    const formatTime = (dateString) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const theme = {
        bgDark: "#12121a", sidebar: "#1c1c26", textLight: "#e2e2ea", 
        textMuted: "#8b8b9e", primary: "#6c5ce7", danger: "#ff4757", 
        bubbleSelf: "#6c5ce7", bubbleOther: "#2d2d3a", inputBg: "#2d2d3a"
    };

    return (
        <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter', system-ui, sans-serif", backgroundColor: theme.bgDark, color: theme.textLight }}>
            <div style={{ width: "260px", backgroundColor: theme.sidebar, padding: "1.5rem", display: "flex", flexDirection: "column", borderRight: `1px solid ${theme.inputBg}` }}>
                <h3 style={{ margin: "0 0 1.5rem 0", fontSize: "1.2rem", fontWeight: "600", letterSpacing: "1px", color: theme.primary }}>VEDACHAT</h3>
                <div style={{ fontSize: "0.85rem", color: theme.textMuted, marginBottom: "1rem", textTransform: "uppercase", fontWeight: "bold" }}>Online Network</div>
                
                <ul style={{ listStyle: "none", padding: 0, margin: 0, overflowY: "auto", flex: 1 }}>
                    {users.map(u => (
                        <li key={u._id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: `1px solid ${theme.inputBg}` }}>
                            <div style={{ position: "relative" }}>
                                <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: theme.primary, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "white" }}>
                                    {u.username.charAt(0).toUpperCase()}
                                </div>
                                <span style={{ position: "absolute", bottom: "0", right: "0", width: "10px", height: "10px", borderRadius: "50%", backgroundColor: u.isOnline ? "#4caf50" : theme.textMuted, border: `2px solid ${theme.sidebar}` }}></span>
                            </div>
                            <span style={{ fontWeight: "500", fontSize: "0.95rem" }}>{u.username}</span>
                        </li>
                    ))}
                </ul>

                <div style={{ marginTop: "auto", paddingTop: "1rem", borderTop: `1px solid ${theme.inputBg}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: theme.inputBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                            {user?.username.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>{user?.username}</span>
                    </div>
                    <button onClick={logout} style={{ background: theme.danger, color: "white", padding: "6px 12px", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "bold" }}>Flee</button>
                </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "1.5rem", borderBottom: `1px solid ${theme.inputBg}`, backgroundColor: theme.bgDark, display: "flex", alignItems: "center", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
                    <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "600" }}># the-abyss</h2>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {messages.map((msg, index) => {
                        const isSelf = msg.sender?._id === user.id;
                        return (
                            <div key={index} style={{ alignSelf: isSelf ? "flex-end" : "flex-start", maxWidth: "65%", display: "flex", flexDirection: "column", alignItems: isSelf ? "flex-end" : "flex-start" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", marginLeft: "4px", marginRight: "4px" }}>
                                    {!isSelf && <span style={{ fontSize: "0.75rem", color: theme.textMuted }}>{msg.sender?.username || "Unknown Entity"}</span>}
                                    <span style={{ fontSize: "0.65rem", color: theme.textMuted }}>{formatTime(msg.createdAt)}</span>
                                </div>
                                <div style={{ 
                                    background: isSelf ? theme.bubbleSelf : theme.bubbleOther, 
                                    color: "white", padding: "10px 14px", borderRadius: "16px", 
                                    borderBottomRightRadius: isSelf ? "4px" : "16px", 
                                    borderBottomLeftRadius: isSelf ? "16px" : "4px", 
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)", lineHeight: "1.4" 
                                }}>
                                    {msg.text}
                                </div>
                            </div>
                        );
                    })}
                    
                    {typingUsers.length > 0 && (
                        <div style={{ alignSelf: "flex-start", color: theme.textMuted, fontSize: "0.85rem", fontStyle: "italic", paddingLeft: "4px" }}>
                            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div style={{ padding: "0 1.5rem 1.5rem 1.5rem" }}>
                    <form onSubmit={handleSend} style={{ display: "flex", gap: "10px", backgroundColor: theme.inputBg, padding: "8px", borderRadius: "8px" }}>
                        <input
                            type="text" value={newMessage} onChange={handleInputChange}
                            placeholder={`Message #the-abyss`}
                            style={{ flex: 1, padding: "12px", borderRadius: "6px", border: "none", backgroundColor: "transparent", color: "white", outline: "none", fontSize: "1rem" }}
                        />
                        <button type="submit" style={{ padding: "10px 24px", background: theme.primary, color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", transition: "0.2s" }}>Send</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Chat;