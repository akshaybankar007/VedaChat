import Message from "../models/Message.js";

export const getMessages = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const cursor = req.query.cursor; 

        let query = {};
        if (cursor) {
            const lastMessage = await Message.findById(cursor);
            if (lastMessage) {
                query = { createdAt: { $lt: lastMessage.createdAt } };
            }
        }

        const messages = await Message.find(query)
            .populate("sender", "username")
            .sort({ createdAt: -1 }) 
            .limit(limit);
            
        res.json({ success: true, messages: messages.reverse() });
    } catch (error) {
        next(error); 
    }
};