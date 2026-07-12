import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
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

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "VEDACHAT Backend Running 🚀"
    });
});

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}. Let's see how long before they break something.`);

    // Map the socket to a user and mark them online
    socket.on("user_join", async (userId) => {
        socket.userId = userId;
        await User.findByIdAndUpdate(userId, { isOnline: true });
        io.emit("user_status", { userId, isOnline: true });
    });

    // Save message to DB and broadcast to everyone
    socket.on("send_message", async (data) => {
        try {
            const newMessage = await Message.create({ sender: data.senderId, text: data.text });
            const populatedMessage = await newMessage.populate("sender", "username");
            io.emit("receive_message", populatedMessage);
        } catch (err) {
            console.error("Message failed to save. Shocking.", err);
        }
    });

    socket.on("disconnect", async () => {
        console.log(`User disconnected: ${socket.id}. Probably rage quit.`);
        if (socket.userId) {
            await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() });
            io.emit("user_status", { userId: socket.userId, isOnline: false });
        }
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});