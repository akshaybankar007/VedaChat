// src2/models/Message.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        sender: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User", 
            required: true 
        },
        receiver: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User", 
            required: true 
        },
        text: { 
            type: String, 
            required: true,
            trim: true, 
            maxlength: [2000, "Message cannot exceed 2000 characters"] //Unbounded size risk
        },
        isRead: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, sender: 1, isRead: 1 }); 

export default mongoose.model("Message", messageSchema);