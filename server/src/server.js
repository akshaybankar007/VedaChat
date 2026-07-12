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

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "VEDACHAT Backend Running 🚀"
    });
});

// Socket Authentication Middleware
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication error: Token missing. How amateur."));
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id; // Trust the token, not the client
        next();
    } catch (err) {
        next(new Error("Authentication error: Invalid token."));
    }
});

io.on("connection", (socket) => {
    console.log(`Authenticated entity connected: ${socket.userId}. Let's see how long before they break something.`);

    socket.on("user_join", async () => {
        await User.findByIdAndUpdate(socket.userId, { isOnline: true });
        io.emit("user_status", { userId: socket.userId, isOnline: true });
    });

    socket.on("send_message", async (data) => {
        try {
            // Force sender ID to be the authenticated socket's ID to prevent spoofing
            const newMessage = await Message.create({ sender: socket.userId, text: data.text });
            const populatedMessage = await newMessage.populate("sender", "username");
            io.emit("receive_message", populatedMessage);
        } catch (err) {
            console.error("Message failed to save. Tragic.", err);
        }
    });

    socket.on("typing", (username) => {
        socket.broadcast.emit("user_typing", username);
    });

    socket.on("stop_typing", (username) => {
        socket.broadcast.emit("user_stop_typing", username);
    });

    socket.on("disconnect", async () => {
        console.log(`Entity disconnected: ${socket.userId}. They escaped.`);
        if (socket.userId) {
            await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() });
            io.emit("user_status", { userId: socket.userId, isOnline: false });
        }
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server surviving on http://localhost:${PORT}`);
});