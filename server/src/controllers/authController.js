import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const generateToken = (id) => {
    return jwt.sign(
        { id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

export const register = async (req, res) => {
    try {
        const { username, email, phone, password } = req.body;

        const orConditions = [{ username }];
        if (email && email.trim() !== "") orConditions.push({ email });
        if (phone && phone.trim() !== "") orConditions.push({ phone });

        const existingUser = await User.findOne({ $or: orConditions });

        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists. Be original." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const userData = { username, password: hashedPassword };
        if (email && email.trim() !== "") userData.email = email;
        if (phone && phone.trim() !== "") userData.phone = phone;

        const user = await User.create(userData);

        res.status(201).json({
            success: true,
            message: "Registration successful",
            token: generateToken(user._id),
            user: { id: user._id, username: user.username, email: user.email, phone: user.phone }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { identifier, password } = req.body;
        const user = await User.findOne({
            $or: [{ username: identifier }, { email: identifier }, { phone: identifier }]
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        }

        res.json({
            success: true,
            message: "Login successful",
            token: generateToken(user._id),
            user: { id: user._id, username: user.username, email: user.email, phone: user.phone }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};