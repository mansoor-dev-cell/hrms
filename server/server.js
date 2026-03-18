const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require("dotenv").config();

const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const User = require("./models/user");
const Attendance = require("./models/attendance");
const Leave = require("./models/leave");

const app = express();

function parseAllowedOrigins() {
  const defaults = [
    "http://localhost:3000",
    "http://localhost:5000",
    "http://localhost:5500",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5000",
    "http://127.0.0.1:5500",
  ];

  const configured = String(process.env.FRONTEND_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([...defaults, ...configured]);
}

const allowedOrigins = parseAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
  }),
);
app.use(express.json());

function hashResetCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function isDevResetCodeExposureEnabled() {
  return (
    String(process.env.ALLOW_DEV_RESET_CODE || "").toLowerCase() === "true"
  );
}

function isAdminRole(user) {
  return user && String(user.role).toLowerCase() === "admin";
}

const DEFAULT_DEPARTMENT = "Sophia Academy";
const VALID_DEPARTMENTS = ["Sophia Academy", "Global Online College"];
const VALID_SUB_DEPARTMENTS = {
  "Sophia Academy": ["Teaching Staff", "Non-Teaching Staff"],
  "Global Online College": ["Sales Team", "Marketing Team"],
};

function normalizeUserDepartmentFields(department, subDepartment) {
  const deptRaw = String(department || "").trim();
  const normalizedDepartment = VALID_DEPARTMENTS.includes(deptRaw)
    ? deptRaw
    : DEFAULT_DEPARTMENT;

  const validSubDepartments =
    VALID_SUB_DEPARTMENTS[normalizedDepartment] ||
    VALID_SUB_DEPARTMENTS[DEFAULT_DEPARTMENT];

  const subRaw = String(subDepartment || "").trim();
  const normalizedSubDepartment = validSubDepartments.includes(subRaw)
    ? subRaw
    : validSubDepartments[0];

  return {
    department: normalizedDepartment,
    subDepartment: normalizedSubDepartment,
  };
}

async function migrateLegacyUsers() {
  const users = await User.find(
    {},
    "department subDepartment status joinDate createdAt",
  ).lean();
  if (!users.length) return;

  const updates = [];
  for (const user of users) {
    const normalized = normalizeUserDepartmentFields(
      user.department,
      user.subDepartment,
    );

    const patch = {};
    if (user.department !== normalized.department) {
      patch.department = normalized.department;
    }
    if (user.subDepartment !== normalized.subDepartment) {
      patch.subDepartment = normalized.subDepartment;
    }
    if (!user.status) {
      patch.status = "Active";
    }
    if (!user.joinDate) {
      patch.joinDate = user.createdAt || new Date();
    }

    if (Object.keys(patch).length) {
      updates.push({
        updateOne: {
          filter: { _id: user._id },
          update: { $set: patch },
        },
      });
    }
  }

  if (!updates.length) {
    console.log("ℹ️ User data migration: no legacy records found.");
    return;
  }

  const result = await User.bulkWrite(updates);
  const modifiedCount =
    result.modifiedCount || result.nModified || result.nMatched || 0;
  console.log(
    `✅ User data migration complete. Updated ${modifiedCount} record(s).`,
  );
}

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token.", error: err.message });
  }
}

function requireAdmin(req, res, next) {
  if (!isAdminRole(req.user)) {
    return res.status(403).json({ message: "Admin access is required." });
  }

  next();
}

// ── MongoDB connection ──────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected");
    try {
      await migrateLegacyUsers();
    } catch (migrationError) {
      console.log("⚠️ User data migration failed:", migrationError.message);
    }
  })
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

    const normalizedDept = normalizeUserDepartmentFields(
      newUser.department,
      newUser.subDepartment,
    );

    res.status(201).json({
      message: "Account created successfully.",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: normalizedDept.department,
        subDepartment: normalizedDept.subDepartment,
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

    const normalizedDept = normalizeUserDepartmentFields(
      user.department,
      user.subDepartment,
    );

    res.json({
      message: "Signed in successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: normalizedDept.department,
        subDepartment: normalizedDept.subDepartment,
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

    user.resetTokenHash = hashResetCode(resetToken);
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    const payload = {
      message: "If this email is registered, a reset code has been sent.",
    };

    if (isDevResetCodeExposureEnabled()) {
      payload.resetCode = resetToken;
      console.log(
        `[Password Reset][DEV ONLY] Code for ${email}: ${resetToken}`,
      );
    }

    res.json(payload);
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
    const providedHash = hashResetCode(token);
    const storedHash = user ? user.resetTokenHash : null;

    if (!user || !storedHash || storedHash !== providedHash)
      return res
        .status(400)
        .json({ message: "Invalid or expired reset code." });

    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date())
      return res.status(400).json({ message: "Reset code has expired. Please request a new one." });

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetTokenHash = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ message: "Password reset successfully. You can now sign in." });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// ── Current User ───────────────────────────────────────────
// GET /api/auth/me
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  const user = req.user;
  const normalizedDept = normalizeUserDepartmentFields(
    user.department,
    user.subDepartment,
  );

  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: normalizedDept.department,
    subDepartment: normalizedDept.subDepartment,
    joinDate: user.joinDate,
    status: user.status,
  });
});

// ── Users ──────────────────────────────────────────────────
// GET /api/users
app.get("/api/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    const normalizedUsers = users.map((userDoc) => {
      const user = userDoc.toObject();
      const normalizedDept = normalizeUserDepartmentFields(
        user.department,
        user.subDepartment,
      );
      return {
        ...user,
        department: normalizedDept.department,
        subDepartment: normalizedDept.subDepartment,
      };
    });

    res.json(normalizedUsers);
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// PATCH /api/users/:id  (admin-only: update role, department, subDepartment, status)
app.patch("/api/users/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role, department, subDepartment, status } = req.body;
    const allowed = {};

    if (role !== undefined) {
      if (!["admin", "employee"].includes(role))
        return res.status(400).json({ message: "Role must be admin or employee." });
      allowed.role = role;
    }

    if (department !== undefined) {
      if (!VALID_DEPARTMENTS.includes(department))
        return res.status(400).json({ message: "Invalid department." });
      allowed.department = department;
    }

    if (subDepartment !== undefined) {
      const parent = allowed.department || department;
      const validSubs = parent ? VALID_SUB_DEPARTMENTS[parent] : null;
      if (validSubs && !validSubs.includes(subDepartment))
        return res.status(400).json({ message: "Invalid sub-department for the selected department." });
      allowed.subDepartment = subDepartment;
    }

    if (status !== undefined) {
      if (!["Active", "On Leave", "Onboarding", "Inactive"].includes(status))
        return res.status(400).json({ message: "Invalid status." });
      allowed.status = status;
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { $set: allowed },
      { new: true },
    ).select("-password");

    if (!updated) return res.status(404).json({ message: "User not found." });

    res.json({ message: "Employee updated.", user: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// ── Attendance ─────────────────────────────────────────────
// GET /api/attendance
app.get("/api/attendance", authenticateToken, async (req, res) => {
  try {
    const records = await Attendance.find(
      isAdminRole(req.user) ? {} : { employeeId: req.user._id },
    )
      .populate("employeeId", "name department role")
      .sort({ date: -1, createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// POST /api/attendance
app.post("/api/attendance", authenticateToken, async (req, res) => {
  try {
    const { employeeId, date, checkIn, checkOut, status, notes } = req.body;
    const targetEmployeeId = isAdminRole(req.user) ? employeeId : req.user._id;

    if (!targetEmployeeId || !date) {
      return res
        .status(400)
        .json({ message: "Employee and date are required." });
    }

    // Try to update existing or create new
    const record = await Attendance.findOneAndUpdate(
      { employeeId: targetEmployeeId, date },
      {
        employeeId: targetEmployeeId,
        checkIn,
        checkOut,
        status,
        notes,
      },
      { new: true, upsert: true },
    ).populate("employeeId", "name department role");

    res.status(201).json({ message: "Attendance saved successfully.", record });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// ── Leaves ─────────────────────────────────────────────────
// GET /api/leaves
app.get("/api/leaves", authenticateToken, async (req, res) => {
  try {
    const leaves = await Leave.find(
      isAdminRole(req.user) ? {} : { employeeId: req.user._id },
    )
      .populate("employeeId", "name department role")
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// POST /api/leaves
app.post("/api/leaves", authenticateToken, async (req, res) => {
  try {
    const { employeeId, type, startDate, endDate, reason } = req.body;
    const targetEmployeeId = isAdminRole(req.user) ? employeeId : req.user._id;

    if (!targetEmployeeId || !type || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const leave = new Leave({
      employeeId: targetEmployeeId,
      type,
      startDate,
      endDate,
      reason,
    });
    await leave.save();

    const populated = await leave.populate(
      "employeeId",
      "name department role",
    );
    res
      .status(201)
      .json({ message: "Leave request submitted.", record: populated });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// PUT /api/leaves/:id
app.put(
  "/api/leaves/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { status } = req.body;
      if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status." });
      }

      const leave = await Leave.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true },
      ).populate("employeeId", "name department role");

      if (!leave) return res.status(404).json({ message: "Leave not found." });

      res.json({ message: `Leave ${status}.`, record: leave });
    } catch (err) {
      res.status(500).json({ message: "Server error.", error: err.message });
    }
  },
);

app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});
