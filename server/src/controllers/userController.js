import User from "../models/User.js";
import Message from "../models/Message.js";

export const getUsers = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        
        const users = await User.find({ _id: { $ne: currentUserId } })
            .select("username isOnline lastSeen")
            .sort({ isOnline: -1, username: 1 })
            .lean();
            
        const usersWithData = await Promise.all(users.map(async (user) => {
            const lastMsg = await Message.findOne({
                $or: [
                    { sender: currentUserId, receiver: user._id },
                    { sender: user._id, receiver: currentUserId }
                ]
            })
            .sort({ createdAt: -1 })
            .select("text createdAt");

            // Count unread messages from this user to the current user
            const unreadCount = await Message.countDocuments({
                sender: user._id,
                receiver: currentUserId,
                isRead: false
            });

            return {
                ...user,
                lastMessage: lastMsg ? lastMsg.text : null,
                lastMessageTime: lastMsg ? lastMsg.createdAt : null,
                unreadCount
            };
        }));
            
        res.json({ success: true, users: usersWithData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};