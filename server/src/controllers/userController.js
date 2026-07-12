import User from "../models/User.js";

export const getUsers = async (req, res) => {
    try {
        // Fetch everyone except the person asking, because they already know they exist. I even don't know whether someone will see this. If they see this comment, they probably will laugh. Haha!!!!
        const users = await User.find({ _id: { $ne: req.user.id } })
            .select("username isOnline lastSeen")
            .sort({ isOnline: -1, username: 1 });
            
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};