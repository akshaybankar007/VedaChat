import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";

const Chat = () => {
    const { user, logout } = useAuth();
    const socket = useSocket();
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newMessage, setNewMessage] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const textareaRef = useRef(null);
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

    // Fetch initial users list
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = localStorage.getItem("token");
                const { data } = await axios.get(`${API_URL}/api/users`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUsers(data.users);
            } catch (err) {
                console.error("Failed to load users.", err);
            }
        };
        fetchUsers();
    }, [API_URL]);

    // Fetch messages when selectedUser changes
    useEffect(() => {
        if (!selectedUser) return;
        
        const fetchMessages = async () => {
            try {
                const token = localStorage.getItem("token");
                const { data } = await axios.get(`${API_URL}/api/messages/${selectedUser._id}?limit=50`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMessages(data.messages);
                setHasMore(data.messages.length === 50);
                setIsTyping(false);
            } catch (err) {
                console.error("Failed to load conversation.", err);
            }
        };
        fetchMessages();
    }, [selectedUser, API_URL]);

    // Socket listeners for 1-on-1 private messaging
    useEffect(() => {
        if (!socket || !user) return;

        socket.emit("user_join");

        const handleReceive = (message) => {
            if (
                selectedUser && 
                (message.sender._id === selectedUser._id || message.sender._id === user.id)
            ) {
                setMessages((prev) => [...prev, message]);
            }
            
            setUsers((prev) => prev.map((u) => {
                const isRelevant = u._id === message.sender._id || 
                                  (message.sender._id === user.id && u._id === message.receiver);
                if (isRelevant) {
                    return { ...u, lastMessage: message.text, lastMessageTime: message.createdAt };
                }
                return u;
            }));
        };

        const handleUserStatus = ({ userId, isOnline }) => {
            setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isOnline } : u));
            if (selectedUser && selectedUser._id === userId) {
                setSelectedUser(prev => ({ ...prev, isOnline }));
            }
        };

        const handleTyping = (senderId) => {
            if (selectedUser && selectedUser._id === senderId) setIsTyping(true);
        };

        const handleStopTyping = (senderId) => {
            if (selectedUser && selectedUser._id === senderId) setIsTyping(false);
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
    }, [socket, user, selectedUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    const loadMoreMessages = async () => {
        if (!messages.length || !selectedUser) return;
        try {
            const token = localStorage.getItem("token");
            const firstMsgId = messages[0]._id;
            const { data } = await axios.get(`${API_URL}/api/messages/${selectedUser._id}?cursor=${firstMsgId}&limit=50`, {
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
        
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

        if (!socket || !user || !selectedUser) return;

        socket.emit("typing", { receiverId: selectedUser._id });
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit("stop_typing", { receiverId: selectedUser._id });
        }, 2000);
    };

    const handleSend = (e) => {
        if (e) e.preventDefault();
        const trimmedMessage = newMessage.trim();
        
        if (!trimmedMessage || !socket || !selectedUser) return;

        socket.emit("send_message", { 
            receiverId: selectedUser._id, 
            text: trimmedMessage 
        });
        
        socket.emit("stop_typing", { receiverId: selectedUser._id });
        
        setNewMessage("");
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (dateString) => dateString ? new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

    return (
        <div className="chat-wrapper">
            <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

            {/* Sidebar List */}
            <div className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div style={{ padding: "24px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700" }}>VedaChat</h3>
                </div>
                
                <div style={{ flex: 1, overflowY: "auto" }}>
                    {users.map(u => (
                        <div 
                            key={u._id} 
                            className={`user-item ${selectedUser?._id === u._id ? 'active' : ''}`}
                            onClick={() => {
                                setSelectedUser(u);
                                setSidebarOpen(false);
                            }}
                        >
                            <div className="avatar">
                                {u.username.charAt(0).toUpperCase()}
                                <span className={`status-indicator ${u.isOnline ? 'status-online' : 'status-offline'}`}></span>
                            </div>
                            <div className="user-info">
                                <div className="user-header">
                                    <span className="user-name">{u.username}</span>
                                    {u.lastMessageTime && <span className="user-time">{formatTime(u.lastMessageTime)}</span>}
                                </div>
                                <div className="user-preview">
                                    {u.lastMessage ? u.lastMessage : <span style={{ fontStyle: "italic", opacity: 0.6 }}>No messages yet</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Logged in User Profile Footer */}
                <div style={{ padding: "20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-dark)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div className="avatar" style={{ width: "36px", height: "36px", fontSize: "0.9rem" }}>
                            {user?.username.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>{user?.username}</span>
                    </div>
                    <button onClick={logout} style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: "500", padding: "4px 8px" }}>
                        Log Out
                    </button>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="chat-main">
                {selectedUser ? (
                    <>
                        <div className="chat-header">
                            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
                                ☰
                            </button>
                            <div className="avatar" style={{ width: "40px", height: "40px", marginRight: "12px", fontSize: "1rem" }}>
                                {selectedUser.username.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "600" }}>{selectedUser.username}</h2>
                                <span style={{ fontSize: "0.8rem", color: selectedUser.isOnline ? "#10b981" : "var(--text-muted)" }}>
                                    {selectedUser.isOnline ? 'Online' : 'Offline'}
                                </span>
                            </div>
                        </div>

                        <div className="messages-container">
                            {hasMore && (
                                <button onClick={loadMoreMessages} className="load-more-btn">
                                    Load previous messages
                                </button>
                            )}

                            {messages.length === 0 ? (
                                <div className="empty-state">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                    <h3>No messages yet</h3>
                                    <p>Start the conversation with {selectedUser.username}.</p>
                                </div>
                            ) : (
                                messages.map((msg, index) => {
                                    const isSelf = msg.sender?._id === user.id;
                                    return (
                                        <div key={index} className={`message-wrapper ${isSelf ? 'message-self' : 'message-other'}`}>
                                            <div className={`message-bubble ${isSelf ? 'bubble-self' : 'bubble-other'}`}>
                                                {msg.text}
                                            </div>
                                            <div className="message-time">
                                                {formatTime(msg.createdAt)}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            
                            {isTyping && (
                                <div className="message-wrapper message-other">
                                    <div className="message-bubble bubble-other" style={{ padding: "8px 16px", fontStyle: "italic", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                        typing...
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="chat-input-container">
                            <form onSubmit={handleSend} className="chat-input-form">
                                <textarea
                                    ref={textareaRef}
                                    className="chat-input"
                                    value={newMessage}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type a message..."
                                    rows={1}
                                />
                                <button type="submit" className="chat-send-btn" disabled={!newMessage.trim()}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13"></line>
                                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                    </svg>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    // Empty State when no chat is selected
                    <div className="chat-main" style={{ alignItems: "center", justifyContent: "center", display: "flex", flexDirection: "column" }}>
                        <button className="mobile-menu-btn" style={{ position: "absolute", top: "20px", left: "20px" }} onClick={() => setSidebarOpen(true)}>
                            ☰
                        </button>
                        <div className="empty-state">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "80px", height: "80px", marginBottom: "20px" }}>
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                            </svg>
                            <h3>Welcome to VedaChat</h3>
                            <p>Select a user from the sidebar to start a private conversation.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chat;