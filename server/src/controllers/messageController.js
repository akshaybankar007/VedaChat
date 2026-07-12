import Message from "../models/Message.js";

export const getMessages = async (req, res, next) => {
    try {
        const { userId: otherUserId } = req.params;
        const currentUserId = req.user.id;
        
        const limit = parseInt(req.query.limit) || 50;
        const cursor = req.query.cursor; 

        let query = {
            $or: [
                { sender: currentUserId, receiver: otherUserId },
                { sender: otherUserId, receiver: currentUserId }
            ]
        };

        if (cursor) {
            const lastMessage = await Message.findById(cursor);
            if (!lastMessage) {
                // Logic 8: Previously silently failed, returning duplicate new pages. Added 400 Bad Request
                const error = new Error("Invalid pagination cursor");
                error.statusCode = 400;
                throw error;
            }
            query.createdAt = { $lt: lastMessage.createdAt };
        }

        const messages = await Message.find(query)
            .populate("sender", "username")
            .populate("receiver", "username")
            .sort({ createdAt: -1 }) 
            .limit(limit);
            
        res.json({ success: true, messages: messages.reverse() });
    } catch (error) {
        next(error); 
    }
};

// Inconsistency 12: REST Fallback Endpoints for Message actions
export const sendMessage = async (req, res, next) => {
    try {
        const { receiverId, text } = req.body;
        
        if (!receiverId || !text || typeof text !== 'string' || text.trim() === '') {
            const error = new Error("Invalid message payload");
            error.statusCode = 400;
            throw error;
        }
        
        const newMessage = await Message.create({ sender: req.user.id, receiver: receiverId, text: text.trim() });
        const populatedMessage = await newMessage.populate("sender", "username");
        
        res.status(201).json({ success: true, message: populatedMessage });
    } catch (error) {
        next(error);
    }
};

export const deleteMessage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const msg = await Message.findOneAndDelete({ _id: id, sender: req.user.id });
        if (!msg) {
            const error = new Error("Message not found or unauthorized to delete");
            error.statusCode = 404;
            throw error;
        }
        res.json({ success: true, message: "Message deleted successfully" });
    } catch (error) {
        next(error);
    }
};

export const markMessagesRead = async (req, res, next) => {
    try {
        const { senderId } = req.params;
        if (!senderId) throw Object.assign(new Error("Invalid sender id"), { statusCode: 400 });

        await Message.updateMany(
            { sender: senderId, receiver: req.user.id, isRead: false },
            { isRead: true }
        );
        res.json({ success: true, message: "Messages marked as read" });
    } catch (error) {
        next(error);
    }
};