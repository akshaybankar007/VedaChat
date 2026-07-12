import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useToast } from "../context/ToastContext";
import axios from "axios";

const Chat = () => {
    const { user, logout } = useAuth();
    const socket = useSocket();
    const { showToast } = useToast();
    
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newMessage, setNewMessage] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);
    
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const textareaRef = useRef(null);
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

    // HOISTED HELPER: Placed before useEffects so it can be called safely
    const scrollToBottom = (behavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    // Close context menu on any outside click
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener("click", handleClick);
        return () => window.removeEventListener("click", handleClick);
    }, []);

    // Fetch initial users
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = localStorage.getItem("token");
                const { data } = await axios.get(`${API_URL}/api/users`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUsers(data.users);
            } catch (err) {
                console.error("Failed to load users:", err);
                showToast("Failed to load users.", "error");
            }
        };
        fetchUsers();
    }, [API_URL, showToast]);

    // Fetch messages & clear unread counts when a user is selected
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
                
                // Clear unread count locally and inform server
                setUsers(prev => prev.map(u => u._id === selectedUser._id ? { ...u, unreadCount: 0 } : u));
                if (socket) socket.emit("mark_read", { senderId: selectedUser._id });

                setTimeout(() => scrollToBottom("auto"), 100);
            } catch (err) {
                console.error("Failed to load conversation:", err);
                showToast("Failed to load conversation.", "error");
            }
        };
        fetchMessages();
    }, [selectedUser, API_URL, socket, showToast]);

    // Socket listeners
    useEffect(() => {
        if (!socket || !user) return;
        socket.emit("user_join");

        const handleReceive = (message) => {
            // If message is for the currently open chat
            if (selectedUser && (message.sender._id === selectedUser._id || message.sender._id === user.id)) {
                setMessages((prev) => {
                    const newMessages = [...prev, message];
                    if (messagesContainerRef.current) {
                        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
                        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
                        if (isNearBottom || message.sender._id === user.id) {
                            setTimeout(() => scrollToBottom("smooth"), 50);
                        }
                    }
                    return newMessages;
                });
                // Mark as read immediately if chat is open
                if (message.sender._id !== user.id) socket.emit("mark_read", { senderId: message.sender._id });
            }
            
            // Update Sidebar
            setUsers((prev) => prev.map((u) => {
                const isRelevant = u._id === message.sender._id || (message.sender._id === user.id && u._id === message.receiver);
                if (isRelevant) {
                    const isUnread = !selectedUser || (selectedUser._id !== u._id && message.sender._id !== user.id);
                    return { 
                        ...u, 
                        lastMessage: message.text, 
                        lastMessageTime: message.createdAt,
                        unreadCount: isUnread ? (u.unreadCount || 0) + 1 : u.unreadCount
                    };
                }
                return u;
            }).sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0)));
        };

        const handleDeleted = (msgId) => {
            setMessages(prev => prev.filter(m => m._id !== msgId));
        };

        const handleUserStatus = ({ userId, isOnline }) => {
            setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isOnline } : u));
            if (selectedUser && selectedUser._id === userId) setSelectedUser(prev => ({ ...prev, isOnline }));
        };

        const handleTyping = (senderId) => {
            if (selectedUser && selectedUser._id === senderId) {
                setIsTyping(true);
                setTimeout(() => scrollToBottom("smooth"), 50);
            }
        };

        const handleStopTyping = (senderId) => {
            if (selectedUser && selectedUser._id === senderId) setIsTyping(false);
        };

        socket.on("receive_message", handleReceive);
        socket.on("message_deleted", handleDeleted);
        socket.on("user_status", handleUserStatus);
        socket.on("user_typing", handleTyping);
        socket.on("user_stop_typing", handleStopTyping);

        return () => {
            socket.off("receive_message", handleReceive);
            socket.off("message_deleted", handleDeleted);
            socket.off("user_status", handleUserStatus);
            socket.off("user_typing", handleTyping);
            socket.off("user_stop_typing", handleStopTyping);
        };
    }, [socket, user, selectedUser]);

    const loadMoreMessages = async () => {
        if (!messages.length || !selectedUser) return;
        try {
            const token = localStorage.getItem("token");
            const { data } = await axios.get(`${API_URL}/api/messages/${selectedUser._id}?cursor=${messages[0]._id}&limit=50`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.messages.length < 50) setHasMore(false);
            setMessages((prev) => [...data.messages, ...prev]);
        } catch (err) {
            console.error("Pagination failed:", err);
            showToast("Pagination failed.", "error");
        }
    };

    const handleSend = (e) => {
        if (e) e.preventDefault();
        const trimmed = newMessage.trim();
        if (!trimmed || !socket || !selectedUser) return;
        
        socket.emit("send_message", { receiverId: selectedUser._id, text: trimmed });
        socket.emit("stop_typing", { receiverId: selectedUser._id });
        
        setNewMessage("");
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleContextMenu = (e, msg) => {
        e.preventDefault();
        setContextMenu({ x: e.pageX, y: e.pageY, msg });
    };

    const copyMessage = () => {
        navigator.clipboard.writeText(contextMenu.msg.text);
        showToast("Copied to clipboard", "success");
    };

    const deleteMessage = () => {
        socket.emit("delete_message", { messageId: contextMenu.msg._id, receiverId: selectedUser._id });
        setContextMenu(null);
    };

    const formatSmartTime = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const now = new Date();
        
        const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
        
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (isToday) return timeString;
        if (isYesterday) return `Yesterday, ${timeString}`;
        return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeString}`;
    };

    return (
        <div className="chat-wrapper">
            <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

            {/* Sidebar */}
            <div className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div style={{ padding: "24px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700" }}>VedaChat</h3>
                </div>
                
                <div style={{ flex: 1, overflowY: "auto" }}>
                    {users.map(u => (
                        <div key={u._id} className={`user-item ${selectedUser?._id === u._id ? 'active' : ''}`} onClick={() => { setSelectedUser(u); setSidebarOpen(false); }}>
                            <div className="avatar">
                                {u.username.charAt(0).toUpperCase()}
                                <span className={`status-indicator ${u.isOnline ? 'status-online' : 'status-offline'}`}></span>
                            </div>
                            <div className="user-info">
                                <div className="user-header">
                                    <span className="user-name">{u.username}</span>
                                    {u.lastMessageTime && <span className="user-time">{formatSmartTime(u.lastMessageTime)}</span>}
                                </div>
                                <div className="user-preview">
                                    {u.lastMessage ? u.lastMessage : <span style={{ fontStyle: "italic", opacity: 0.6 }}>No messages yet</span>}
                                </div>
                            </div>
                            {/* Unread Badge */}
                            {u.unreadCount > 0 && (
                                <div className="unread-badge">{u.unreadCount}</div>
                            )}
                        </div>
                    ))}
                </div>

                <div style={{ padding: "20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-dark)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div className="avatar" style={{ width: "36px", height: "36px", fontSize: "0.9rem" }}>{user?.username.charAt(0).toUpperCase()}</div>
                        <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>{user?.username}</span>
                    </div>
                    <button onClick={logout} style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: "500" }}>Log Out</button>
                </div>
            </div>

            {/* Main Area */}
            <div className="chat-main">
                {selectedUser ? (
                    <>
                        <div className="chat-header">
                            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
                            <div className="avatar" style={{ width: "40px", height: "40px", marginRight: "12px", fontSize: "1rem" }}>
                                {selectedUser.username.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "600" }}>{selectedUser.username}</h2>
                                <span style={{ fontSize: "0.8rem", color: selectedUser.isOnline ? "#10b981" : "var(--text-muted)", transition: "color 0.3s" }}>
                                    {selectedUser.isOnline ? 'Online' : 'Offline'}
                                </span>
                            </div>
                        </div>

                        <div className="messages-container" ref={messagesContainerRef}>
                            {hasMore && <button onClick={loadMoreMessages} className="load-more-btn">Load previous messages</button>}
                            
                            {messages.length === 0 ? (
                                <div className="empty-state">
                                    <h3>No messages yet</h3>
                                    <p>Start the conversation with {selectedUser.username}.</p>
                                </div>
                            ) : (
                                messages.map((msg, index) => {
                                    const isSelf = msg.sender?._id === user.id;
                                    const showDateSeparator = index === 0 || new Date(messages[index - 1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();

                                    return (
                                        <div key={msg._id || index} style={{ display: "flex", flexDirection: "column" }}>
                                            {showDateSeparator && <div className="date-separator"><span>{formatSmartTime(msg.createdAt).split(',')[0]}</span></div>}
                                            <div 
                                                className={`message-wrapper ${isSelf ? 'message-self' : 'message-other'}`}
                                                onContextMenu={(e) => handleContextMenu(e, msg)}
                                            >
                                                <div className={`message-bubble ${isSelf ? 'bubble-self' : 'bubble-other'}`}>{msg.text}</div>
                                                <div className="message-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            {isTyping && (
                                <div className="message-wrapper message-other">
                                    <div className="message-bubble bubble-other typing-indicator-bubble">
                                        <div className="typing-dot"></div>
                                        <div className="typing-dot"></div>
                                        <div className="typing-dot"></div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} style={{ height: 1 }} />
                        </div>

                        <div className="chat-input-container">
                            <form onSubmit={handleSend} className="chat-input-form">
                                <textarea 
                                    ref={textareaRef} 
                                    className="chat-input" 
                                    value={newMessage} 
                                    onChange={(e) => { 
                                        setNewMessage(e.target.value); 
                                        e.target.style.height = 'auto'; 
                                        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; 
                                        socket.emit("typing", { receiverId: selectedUser._id }); 
                                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); 
                                        typingTimeoutRef.current = setTimeout(() => socket.emit("stop_typing", { receiverId: selectedUser._id }), 2000); 
                                    }} 
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
                    <div className="chat-main" style={{ alignItems: "center", justifyContent: "center", display: "flex", flexDirection: "column" }}>
                        <button className="mobile-menu-btn" style={{ position: "absolute", top: "20px", left: "20px" }} onClick={() => setSidebarOpen(true)}>☰</button>
                        <div className="empty-state">
                            <h3>Welcome to VedaChat</h3>
                            <p>Select a user from the sidebar to start a private conversation.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Context Menu Overlay */}
            {contextMenu && (
                <div 
                    className="context-menu" 
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button className="context-menu-item" onClick={copyMessage}>Copy Text</button>
                    {contextMenu.msg.sender._id === user.id && (
                        <button className="context-menu-item delete-text" onClick={deleteMessage}>Delete for me</button>
                    )}
                </div>
            )}
        </div>
    );
};

export default Chat;