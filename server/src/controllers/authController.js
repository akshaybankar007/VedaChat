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

export const register = async (req, res, next) => {
    try {
        // Gap 19 / Logic 5: Strict early trim prevents bypass
        const username = req.body.username?.trim();
        const email = req.body.email?.trim();
        const phone = req.body.phone?.trim();
        const password = req.body.password;

        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const userData = { username, password: hashedPassword };
        if (email) userData.email = email;
        if (phone) userData.phone = phone;

        // Logic 6: Removed explicit pre-check to let MongoDB's unique index natively trigger 11000 Error
        const user = await User.create(userData);

        res.status(201).json({
            success: true,
            message: "Registration successful",
            token: generateToken(user._id),
            // Inconsistency 13: Returned _id to match UI mapping
            user: { _id: user._id, username: user.username, email: user.email, phone: user.phone }
        });
    } catch (error) {
        next(error); // Inconsistency 10
    }
};

export const login = async (req, res, next) => {
    try {
        const identifier = req.body.identifier?.trim(); // Gap 19
        const password = req.body.password;

        if (!identifier || !password) {
            return res.status(400).json({ success: false, message: "Provide identifier and password" });
        }

        // Critical 2 fix requires `.select("+password")` to log them in
        const user = await User.findOne({
            $or: [{ username: identifier }, { email: identifier }, { phone: identifier }]
        }).select("+password");

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
            user: { _id: user._id, username: user.username, email: user.email, phone: user.phone } // Inconsistency 13
        });
    } catch (error) {
        next(error); // Inconsistency 10
    }
};