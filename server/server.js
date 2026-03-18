const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const Admin = require("./models/admin");
const User = require("./models/user");
const Attendance = require("./models/attendance");
const Leave = require("./models/leave");

const app = express();

app.use(cors());
app.use(express.json());

// ── MongoDB connection ──────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

// ── Health check ───────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("HRMS Backend Running");
});

// ── Register ───────────────────────────────────────────────
// POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required." });

    const existing = await User.findOne({ email });
    if (existing)
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });

    const hashed = await bcrypt.hash(password, 12);
    const newUser = await User.create({ name, email, password: hashed });

    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      message: "Account created successfully.",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        joinDate: newUser.joinDate,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// ── Login ──────────────────────────────────────────────────
// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required." });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid email or password." });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: "Invalid email or password." });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      message: "Signed in successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        joinDate: user.joinDate,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// ── Forgot Password ───────────────────────────────────────
// POST /api/auth/forgot-password
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always return the same message to prevent user enumeration
    if (!user) {
      return res.json({ message: "If this email is registered, a reset code has been sent." });
    }

    // Generate a 6-digit numeric reset code
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // NOTE: In production, send this code by email.
    // For this local HRMS, the code is returned in the response.
    console.log(`[Password Reset] Code for ${email}: ${resetToken}`);

    res.json({
      message: "If this email is registered, a reset code has been sent.",
      // Remove the next line in production and use email delivery instead:
      resetCode: resetToken
    });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// ── Reset Password ─────────────────────────────────────────
// POST /api/auth/reset-password
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword)
      return res.status(400).json({ message: "Email, reset code, and new password are required." });

    if (newPassword.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || user.resetToken !== token)
      return res.status(400).json({ message: "Invalid or expired reset code." });

    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date())
      return res.status(400).json({ message: "Reset code has expired. Please request a new one." });

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ message: "Password reset successfully. You can now sign in." });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// ── Current User ───────────────────────────────────────────
// GET /api/auth/me
app.get("/api/auth/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      joinDate: user.joinDate,
    });
  } catch (err) {
    res.status(401).json({ message: "Invalid token.", error: err.message });
  }
});

// ── Users ──────────────────────────────────────────────────
// GET /api/users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// ── Attendance ─────────────────────────────────────────────
// GET /api/attendance
app.get("/api/attendance", async (req, res) => {
  try {
    const records = await Attendance.find()
      .populate("employeeId", "name department role")
      .sort({ date: -1, createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// POST /api/attendance
app.post("/api/attendance", async (req, res) => {
  try {
    const { employeeId, date, checkIn, checkOut, status, notes } = req.body;

    if (!employeeId || !date) {
      return res.status(400).json({ message: "Employee and date are required." });
    }

    // Try to update existing or create new
    const record = await Attendance.findOneAndUpdate(
      { employeeId, date },
      { checkIn, checkOut, status, notes },
      { new: true, upsert: true }
    ).populate("employeeId", "name department role");

    res.status(201).json({ message: "Attendance saved successfully.", record });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// ── Leaves ─────────────────────────────────────────────────
// GET /api/leaves
app.get("/api/leaves", async (req, res) => {
  try {
    const leaves = await Leave.find()
      .populate("employeeId", "name department role")
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// POST /api/leaves
app.post("/api/leaves", async (req, res) => {
  try {
    const { employeeId, type, startDate, endDate, reason } = req.body;

    if (!employeeId || !type || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const leave = new Leave({ employeeId, type, startDate, endDate, reason });
    await leave.save();

    const populated = await leave.populate("employeeId", "name department role");
    res.status(201).json({ message: "Leave request submitted.", record: populated });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// PUT /api/leaves/:id
app.put("/api/leaves/:id", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("employeeId", "name department role");

    if (!leave) return res.status(404).json({ message: "Leave not found." });

    res.json({ message: `Leave ${status}.`, record: leave });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// ── Legacy: Create admin (unchanged) ──────────────────────
app.post("/create-admin", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ name, email, password: hashedPassword });
    await newAdmin.save();
    res.json({ message: "Admin created successfully", admin: newAdmin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});
