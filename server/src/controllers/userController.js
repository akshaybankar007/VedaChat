import User from "../models/User.js";
import Message from "../models/Message.js";
import mongoose from "mongoose";

export const getUsers = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        
        // Fetch users except current
        const users = await User.find({ _id: { $ne: currentUserId } })
            .select("username isOnline lastSeen")
            .sort({ isOnline: -1, username: 1 })
            .lean();
            
        // Append last message for sidebar preview
        const usersWithMessages = await Promise.all(users.map(async (user) => {
            const lastMsg = await Message.findOne({
                $or: [
                    { sender: currentUserId, receiver: user._id },
                    { sender: user._id, receiver: currentUserId }
                ]
            })
            .sort({ createdAt: -1 })
            .select("text createdAt");

            return {
                ...user,
                lastMessage: lastMsg ? lastMsg.text : null,
                lastMessageTime: lastMsg ? lastMsg.createdAt : null
            };
        }));
            
        res.json({ success: true, users: usersWithMessages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};