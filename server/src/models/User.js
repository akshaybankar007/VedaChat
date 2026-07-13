import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username is too short. It needs to be at least 3 characters."],
      maxlength: [20, "Username is too long. Keep it under 20 characters."],
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"]
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      match: [/^\d{10,15}$/, "Please use a valid phone number (10-15 digits)"]
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"], // Stop "" passwords
      select: false, // Prevent password hash leaks in arbitrary reads
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  }, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;