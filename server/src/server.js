import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import Message from "./models/Message.js";
import User from "./models/User.js";
import { errorHandler } from "./middleware/errorMiddleware.js";

dotenv.config();

//Process level handlers
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! Shutting down...', err);
    process.exit(1);
});

// Environment variable startup check
if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
    console.error("FATAL ERROR: JWT_SECRET or MONGO_URI is not defined.");
    process.exit(1);
}

connectDB();

const app = express();
const server = http.createServer(app);

// Unified CORS definition
const CORS_ORIGIN = process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(server, {
    cors: {
        origin: CORS_ORIGIN,
        credentials: true
    }
});

app.set("io", io);

app.use(cors({
    origin: CORS_ORIGIN,
    credentials: true
}));

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

app.get("/", (req, res) => res.status(200).json({ success: true, message: "VEDACHAT Backend Running 🚀" }));

//Catch-all 404 router before global error handler
app.use((req, res, next) => {
    const err = new Error(`Route ${req.originalUrl} not found`);
    err.statusCode = 404;
    next(err);
});

app.use(errorHandler);

io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication error: Token missing."));
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        next();
    } catch (err) {
        next(new Error("Authentication error: Invalid token."));
    }
});

io.on("connection", (socket) => {
    socket.join(socket.userId);

    socket.on("user_join", async () => {
        try { // Critical 1: Try/Catch wrapper
            await User.findByIdAndUpdate(socket.userId, { isOnline: true });
            io.emit("user_status", { userId: socket.userId, isOnline: true });
        } catch (err) {
            console.error("user_join failed", err);
        }
    });

    socket.on("send_message", async (data) => {
        try {
            const { receiverId, text } = data;
            
            // Payload validation
            if (!receiverId || !text || typeof text !== 'string' || text.trim() === '') {
                return socket.emit("message_error", { message: "Invalid message payload" }); // Logic 9: Failure feedback
            }
            
            const newMessage = await Message.create({ sender: socket.userId, receiver: receiverId, text: text.trim() });
            const populatedMessage = await newMessage.populate("sender", "username");
            
            io.to(receiverId).to(socket.userId).emit("receive_message", populatedMessage);
        } catch (err) {
            console.error("Message failed to save.", err);
            socket.emit("message_error", { message: "Failed to send message", error: err.message }); 
        }
    });

    socket.on("mark_read", async ({ senderId }) => {
        try {
            if (!senderId) return socket.emit("message_error", { message: "Invalid senderId payload" });
            
            await Message.updateMany(
                { sender: senderId, receiver: socket.userId, isRead: false },
                { isRead: true }
            );
            io.to(senderId).emit("messages_read", { readerId: socket.userId });
        } catch (err) {
            console.error("mark_read failed", err);
        }
    });

    socket.on("delete_message", async ({ messageId, receiverId }) => {
        try {
            if (!messageId || !receiverId) return socket.emit("message_error", { message: "Invalid delete payload" });

            const msg = await Message.findOneAndDelete({ _id: messageId, sender: socket.userId });
            if (msg) {
                io.to(receiverId).to(socket.userId).emit("message_deleted", messageId);
            } else {
                socket.emit("message_error", { message: "Message not found or unauthorized to delete" });
            }
        } catch (err) {
            console.error("Delete failed.", err);
            socket.emit("message_error", { message: "Failed to delete message", error: err.message });
        }
    });

    socket.on("typing", ({ receiverId }) => socket.to(receiverId).emit("user_typing", socket.userId));
    socket.on("stop_typing", ({ receiverId }) => socket.to(receiverId).emit("user_stop_typing", socket.userId));

    socket.on("disconnect", async () => {
        try {
            if (socket.userId) {
                // Critical 4: Presence Tracking Connection Reference Count
                const matchingSockets = await io.in(socket.userId).fetchSockets();
                const isDisconnected = matchingSockets.length === 0;

                if (isDisconnected) {
                    await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() });
                    io.emit("user_status", { userId: socket.userId, isOnline: false });
                }
            }
        } catch (err) {
            console.error("disconnect handler failed", err);
        }
    });
});

const PORT = process.env.PORT || 5000;
const serverInstance = server.listen(PORT, () => console.log(`Server surviving on http://localhost:${PORT}`));

//Unhandled Promise Rejections process shutdown
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! Shutting down...', err);
    serverInstance.close(() => process.exit(1));
});