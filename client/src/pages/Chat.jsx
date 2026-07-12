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
    const [hasMore, setHasMore] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const token = localStorage.getItem("token");
                const headers = { Authorization: `Bearer ${token}` };
                
                const [msgRes, usersRes] = await Promise.all([
                    axios.get(`${API_URL}/api/messages?limit=50`, { headers }),
                    axios.get(`${API_URL}/api/users`, { headers })
                ]);
                
                setMessages(msgRes.data.messages);
                setUsers(usersRes.data.users);
                if (msgRes.data.messages.length < 50) setHasMore(false);
            } catch (err) {
                console.error("Failed to load initial data.", err);
            }
        };
        fetchInitialData();
    }, [API_URL]);

    useEffect(() => {
        if (!socket || !user) return;

        socket.emit("user_join");

        const handleReceive = (message) => setMessages((prev) => [...prev, message]);
        const handleUserStatus = ({ userId, isOnline }) => setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isOnline } : u));
        const handleTyping = (username) => setTypingUsers((prev) => prev.includes(username) ? prev : [...prev, username]);
        const handleStopTyping = (username) => setTypingUsers((prev) => prev.filter((u) => u !== username));

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

    const loadMoreMessages = async () => {
        if (!messages.length) return;
        try {
            const token = localStorage.getItem("token");
            const firstMsgId = messages[0]._id;
            const { data } = await axios.get(`${API_URL}/api/messages?cursor=${firstMsgId}&limit=50`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (data.messages.length < 50) setHasMore(false);
            setMessages((prev) => [...data.messages, ...prev]);
        } catch (err) {
            console.error("Pagination failed.", err);
        }
    };

    const handleInputChange = (e) => {
        setNewMessage(e.target.value);
        if (!socket || !user) return;

        socket.emit("typing", user.username);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => socket.emit("stop_typing", user.username), 2000);
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        socket.emit("send_message", { text: newMessage });
        socket.emit("stop_typing", user.username);
        setNewMessage("");
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };

    const formatTime = (dateString) => dateString ? new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

    return (
        <div className="chat-wrapper">
            {/* Mobile Overlay */}
            <div 
                className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} 
                onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <div className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 className="auth-title" style={{ margin: 0, fontSize: "1.5rem" }}>VedaChat</h3>
                    <span style={{ fontSize: "1.2rem", cursor: "pointer" }}>📝</span>
                </div>
                
                <div style={{ padding: "0 20px 10px", fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600" }}>
                    Messages
                </div>
                
                <div style={{ flex: 1, overflowY: "auto" }}>
                    {users.map(u => (
                        <div key={u._id} className="user-item">
                            <div className="avatar">
                                {u.username.charAt(0).toUpperCase()}
                                <span className={`status-dot ${u.isOnline ? 'status-online' : 'status-offline'}`}></span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontWeight: "600", fontSize: "0.95rem" }}>{u.username}</span>
                                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{u.isOnline ? 'Active now' : 'Offline'}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ padding: "20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div className="avatar" style={{ width: "36px", height: "36px", fontSize: "0.9rem" }}>
                            {user?.username.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>{user?.username}</span>
                    </div>
                    <button onClick={logout} style={{ background: "transparent", color: "#ff416c", border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600" }}>
                        Log Out
                    </button>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="chat-main">
                <div className="chat-header">
                    <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
                        ☰
                    </button>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div className="avatar" style={{ width: "32px", height: "32px", marginBottom: "4px", fontSize: "0.9rem" }}>
                            ♡
                        </div>
                        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>Global Chat</h2>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>VedaChat Network</span>
                    </div>
                </div>

                <div className="messages-container">
                    {hasMore && (
                        <button onClick={loadMoreMessages} className="load-more-btn">
                            Load earlier messages
                        </button>
                    )}

                    {messages.map((msg, index) => {
                        const isSelf = msg.sender?._id === user.id;
                        return (
                            <div key={index} className={`message-wrapper ${isSelf ? 'message-self' : 'message-other'}`}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", padding: "0 4px" }}>
                                    {!isSelf && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "500" }}>{msg.sender?.username || "Ghost"}</span>}
                                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{formatTime(msg.createdAt)}</span>
                                </div>
                                <div className={`message-bubble ${isSelf ? 'bubble-self' : 'bubble-other'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        );
                    })}
                    
                    {typingUsers.length > 0 && (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic", paddingLeft: "4px" }}>
                            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-container">
                    <form onSubmit={handleSend} className="chat-input-form">
                        <span style={{ color: "var(--text-muted)", fontSize: "1.2rem", cursor: "pointer", paddingLeft: "5px" }}>📷</span>
                        <input 
                            type="text" 
                            className="chat-input" 
                            value={newMessage} 
                            onChange={handleInputChange} 
                            placeholder="Message..." 
                        />
                        {newMessage.trim() ? (
                            <button type="submit" className="chat-send-btn">
                                💌
                            </button>
                        ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "1.2rem", cursor: "pointer", paddingRight: "5px" }}>🎤</span>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Chat;