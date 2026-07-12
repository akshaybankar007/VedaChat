import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import nodemailer from "nodemailer";

const generateToken = (id) => {
    return jwt.sign(
        { id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

// Configure the Mailman
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, 
    },
});

export const register = async (req, res) => {
    try {
        const { username, email, phone, password } = req.body;

        const existingUser = await User.findOne({
            $or: [{ username }, { email }, { phone }]
        });

        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists. Be original." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ username, email, phone, password: hashedPassword });

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

        // Fire off panic-inducing security email asynchronously
        if (user.email) {
            const mailOptions = {
                from: `"VedaChat Security" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: "New Login Detected - VedaChat",
                html: `
                    <div style="font-family: 'Inter', sans-serif; padding: 20px; color: #121212; background: #fffafb; border-radius: 8px;">
                        <h2 style="color: #dc2743;">New Access Detected</h2>
                        <p>Hello <b>${user.username}</b>,</p>
                        <p>Someone just crawled into your VedaChat account.</p>
                        <p><b>Time:</b> ${new Date().toLocaleString()}</p>
                        <p>If this was you, congratulations on remembering your password.</p>
                        <p>If it wasn't, your data is probably already compromised. Change your password immediately.</p>
                        <br/>
                        <p>With sympathy,<br/>VedaChat Security</p>
                    </div>
                `
            };

            transporter.sendMail(mailOptions).catch(err => {
                console.error("Failed to deliver the bad news via email:", err.message);
            });
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