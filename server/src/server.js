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
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true
    }
});

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
}));

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

app.get("/", (req, res) => res.status(200).json({ success: true, message: "VEDACHAT Backend Running 🚀" }));

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
        await User.findByIdAndUpdate(socket.userId, { isOnline: true });
        io.emit("user_status", { userId: socket.userId, isOnline: true });
    });

    socket.on("send_message", async (data) => {
        try {
            const { receiverId, text } = data;
            const newMessage = await Message.create({ sender: socket.userId, receiver: receiverId, text });
            const populatedMessage = await newMessage.populate("sender", "username");
            
            io.to(receiverId).to(socket.userId).emit("receive_message", populatedMessage);
        } catch (err) {
            console.error("Message failed to save.", err);
        }
    });

    // Mark messages as read
    socket.on("mark_read", async ({ senderId }) => {
        await Message.updateMany(
            { sender: senderId, receiver: socket.userId, isRead: false },
            { isRead: true }
        );
        io.to(senderId).emit("messages_read", { readerId: socket.userId });
    });

    // Delete message
    socket.on("delete_message", async ({ messageId, receiverId }) => {
        try {
            const msg = await Message.findOneAndDelete({ _id: messageId, sender: socket.userId });
            if (msg) {
                io.to(receiverId).to(socket.userId).emit("message_deleted", messageId);
            }
        } catch (err) {
            console.error("Delete failed.", err);
        }
    });

    socket.on("typing", ({ receiverId }) => socket.to(receiverId).emit("user_typing", socket.userId));
    socket.on("stop_typing", ({ receiverId }) => socket.to(receiverId).emit("user_stop_typing", socket.userId));

    socket.on("disconnect", async () => {
        if (socket.userId) {
            await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() });
            io.emit("user_status", { userId: socket.userId, isOnline: false });
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server surviving on http://localhost:${PORT}`));