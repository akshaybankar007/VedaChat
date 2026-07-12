import express from "express";
import { getMessages, sendMessage, deleteMessage, markMessagesRead } from "../controllers/messageController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:userId", protect, getMessages);

// Inconsistency 12: Mount REST fallbacks
router.post("/", protect, sendMessage);
router.delete("/:id", protect, deleteMessage);
router.put("/mark-read/:senderId", protect, markMessagesRead);

export default router;