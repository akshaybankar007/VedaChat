import Message from "../models/Message.js";

export const getMessages = async (req, res) => {
    try {
        // Fetch the last 50 messages only because we have free database tier only
        const messages = await Message.find()
            .populate("sender", "username")
            .sort({ createdAt: 1 })
            .limit(50);
            
        res.json({ success: true, messages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};