import mongoose from "mongoose";
import User from "../models/User.js";

export const getUsers = async (req, res, next) => {
    try {
        const currentUserId = new mongoose.Types.ObjectId(req.user.id);
        
        // Gap 16: Removed N+1 bottleneck entirely via unified aggregation 
        const usersWithData = await User.aggregate([
            { $match: { _id: { $ne: currentUserId } } },
            {
                $lookup: {
                    from: "messages",
                    let: { otherId: "$_id" },
                    pipeline: [
                        { $match: {
                            $expr: {
                                $or: [
                                    { $and: [{ $eq: ["$sender", "$$otherId"] }, { $eq: ["$receiver", currentUserId] }] },
                                    { $and: [{ $eq: ["$sender", currentUserId] }, { $eq: ["$receiver", "$$otherId"] }] }
                                ]
                            }
                        }},
                        { $sort: { createdAt: -1 } },
                        { $limit: 1 }
                    ],
                    as: "lastMessageDoc"
                }
            },
            {
                $lookup: {
                    from: "messages",
                    let: { otherId: "$_id" },
                    pipeline: [
                        { $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$sender", "$$otherId"] },
                                    { $eq: ["$receiver", currentUserId] },
                                    { $eq: ["$isRead", false] }
                                ]
                            }
                        }},
                        { $count: "unreadCount" }
                    ],
                    as: "unreadData"
                }
            },
            {
                $addFields: {
                    lastMessage: { $arrayElemAt: ["$lastMessageDoc.text", 0] },
                    lastMessageTime: { $arrayElemAt: ["$lastMessageDoc.createdAt", 0] },
                    unreadCount: { $ifNull: [{ $arrayElemAt: ["$unreadData.unreadCount", 0] }, 0] }
                }
            },
            { $project: { password: 0, lastMessageDoc: 0, unreadData: 0, email: 0, phone: 0, createdAt: 0, updatedAt: 0, __v: 0 } },
            { $sort: { isOnline: -1, username: 1 } }
        ]);
            
        res.json({ success: true, users: usersWithData });
    } catch (error) {
        next(error); // Inconsistency 10
    }
};