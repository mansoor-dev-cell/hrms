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
const AttendancePolicy = require("./models/attendancePolicy");
const Leave = require("./models/leave");

const app = express();
const PORT = Number(process.env.PORT) || 5001;

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
function formatDateKey(dateValue = new Date()) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeHHMM(dateValue = new Date()) {
  const date = new Date(dateValue);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function timeToMinutes(hhmm) {
  if (!/^\d{2}:\d{2}$/.test(String(hhmm || ""))) return null;
  const [hh, mm] = String(hhmm).split(":").map(Number);
  if (!Number.isInteger(hh) || !Number.isInteger(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const r = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return r * c;
}

async function getOrCreateAttendancePolicy() {
  const existing = await AttendancePolicy.findOne();
  if (existing) return existing;
  return AttendancePolicy.create({});
}

// GET /api/attendance
app.get("/api/attendance", authenticateToken, async (req, res) => {
  try {
    const records = await Attendance.find(
      isAdminRole(req.user) ? {} : { employeeId: req.user._id },
    )
      .populate("employeeId", "name department subDepartment role")
      .populate("approvedBy", "name email")
      .sort({ date: -1, createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// GET /api/attendance/policy
app.get("/api/attendance/policy", authenticateToken, async (req, res) => {
  try {
    const policy = await getOrCreateAttendancePolicy();
    const hasLocation =
      Number.isFinite(Number(policy.officeLocation?.latitude)) &&
      Number.isFinite(Number(policy.officeLocation?.longitude));

    if (isAdminRole(req.user)) {
      return res.json(policy);
    }

    return res.json({
      officeName: policy.officeName,
      geofenceRadiusMeters: policy.geofenceRadiusMeters,
      lateAfter: policy.lateAfter,
      isLocationEnforced: policy.isLocationEnforced,
      hasOfficeLocation: hasLocation,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// PUT /api/attendance/policy
app.put("/api/attendance/policy", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      officeName,
      officeLatitude,
      officeLongitude,
      geofenceRadiusMeters,
      lateAfter,
      isLocationEnforced,
    } = req.body;

    if (lateAfter !== undefined && timeToMinutes(lateAfter) === null) {
      return res.status(400).json({ message: "lateAfter must be in HH:MM format." });
    }

    if (
      geofenceRadiusMeters !== undefined &&
      (!Number.isFinite(Number(geofenceRadiusMeters)) || Number(geofenceRadiusMeters) < 10)
    ) {
      return res
        .status(400)
        .json({ message: "geofenceRadiusMeters must be a number >= 10." });
    }

    const patch = {};
    if (officeName !== undefined) patch.officeName = String(officeName || "").trim();
    if (lateAfter !== undefined) patch.lateAfter = String(lateAfter);
    if (geofenceRadiusMeters !== undefined) {
      patch.geofenceRadiusMeters = Number(geofenceRadiusMeters);
    }
    if (isLocationEnforced !== undefined) {
      patch.isLocationEnforced = Boolean(isLocationEnforced);
    }
    if (officeLatitude !== undefined || officeLongitude !== undefined) {
      if (!Number.isFinite(Number(officeLatitude)) || !Number.isFinite(Number(officeLongitude))) {
        return res.status(400).json({ message: "Valid office latitude and longitude are required." });
      }
      patch.officeLocation = {
        latitude: Number(officeLatitude),
        longitude: Number(officeLongitude),
      };
    }

    const existing = await getOrCreateAttendancePolicy();
    Object.assign(existing, patch);
    await existing.save();

    return res.json({ message: "Attendance policy updated.", policy: existing });
  } catch (err) {
    return res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// POST /api/attendance/mark-self
app.post("/api/attendance/mark-self", authenticateToken, async (req, res) => {
  try {
    const { date, notes, location } = req.body;
    const today = formatDateKey(new Date());
    const selectedDate = String(date || today);

    if (selectedDate !== today) {
      return res
        .status(400)
        .json({ message: "Self attendance can only be marked for today." });
    }

    const existing = await Attendance.findOne({
      employeeId: req.user._id,
      date: selectedDate,
    });
    if (existing) {
      if (!existing.checkOut || existing.checkOut === "--:--") {
        existing.checkOut = formatTimeHHMM(new Date());
        if (String(notes || "").trim()) {
          const previous = String(existing.notes || "").trim();
          const suffix = `Checkout note: ${String(notes).trim()}`;
          existing.notes = previous ? `${previous} | ${suffix}` : suffix;
        }
        await existing.save();
        const populatedExisting = await existing.populate(
          "employeeId",
          "name department subDepartment role",
        );

        return res.status(200).json({
          message: "Check-out captured for today.",
          record: populatedExisting,
        });
      }

      return res
        .status(409)
        .json({ message: "Attendance already fully marked for today." });
    }

    const policy = await getOrCreateAttendancePolicy();
    const now = new Date();
    const markedAtTime = formatTimeHHMM(now);
    const lateThreshold = timeToMinutes(policy.lateAfter);
    const nowMinutes = timeToMinutes(markedAtTime);
    const isLate =
      Number.isFinite(lateThreshold) && Number.isFinite(nowMinutes)
        ? nowMinutes > lateThreshold
        : false;

    const lat = Number(location?.latitude);
    const lng = Number(location?.longitude);
    const hasMarkedLocation = Number.isFinite(lat) && Number.isFinite(lng);
    const officeLat = Number(policy.officeLocation?.latitude);
    const officeLng = Number(policy.officeLocation?.longitude);
    const hasOfficeLocation =
      Number.isFinite(officeLat) && Number.isFinite(officeLng);

    let distanceMeters = null;
    let locationMatch = null;
    if (hasMarkedLocation && hasOfficeLocation) {
      distanceMeters = haversineMeters(lat, lng, officeLat, officeLng);
      locationMatch = distanceMeters <= Number(policy.geofenceRadiusMeters || 200);
    }

    const requiresLocation = Boolean(policy.isLocationEnforced);
    const canAutoApprove =
      !requiresLocation ||
      (hasOfficeLocation && hasMarkedLocation && locationMatch === true);

    const record = await Attendance.create({
      employeeId: req.user._id,
      date: selectedDate,
      checkIn: markedAtTime,
      checkOut: "--:--",
      status: isLate ? "late" : "present",
      notes: String(notes || "").trim(),
      approvalStatus: canAutoApprove ? "approved" : "pending",
      markedVia: "self",
      isAutoApproved: canAutoApprove,
      approvedAt: canAutoApprove ? now : null,
      markedAtTime,
      markedLocation: {
        latitude: hasMarkedLocation ? lat : null,
        longitude: hasMarkedLocation ? lng : null,
        accuracy: Number.isFinite(Number(location?.accuracy))
          ? Number(location.accuracy)
          : null,
      },
      locationCheck: {
        isMatch: locationMatch,
        distanceMeters,
        radiusMeters: Number(policy.geofenceRadiusMeters || 200),
      },
    });

    const populated = await record.populate("employeeId", "name department subDepartment role");
    return res.status(201).json({
      message: canAutoApprove
        ? "Attendance marked and auto-approved."
        : "Attendance marked and sent for admin approval.",
      record: populated,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// POST /api/attendance
app.post("/api/attendance", authenticateToken, async (req, res) => {
  try {
    if (!isAdminRole(req.user)) {
      return res.status(403).json({ message: "Only admins can manually create attendance records." });
    }

    const { employeeId, date, checkIn, checkOut, status, notes } = req.body;
    const targetEmployeeId = employeeId;

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
        approvalStatus: "approved",
        approvedBy: req.user._id,
        approvedAt: new Date(),
        markedVia: "admin",
        isAutoApproved: false,
        reviewNotes: "Created/updated manually by admin.",
      },
      { new: true, upsert: true },
    )
      .populate("employeeId", "name department subDepartment role")
      .populate("approvedBy", "name email");

    res.status(201).json({ message: "Attendance saved successfully.", record });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

// PUT /api/attendance/:id/review
app.put(
  "/api/attendance/:id/review",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { decision, status, reviewNotes, checkIn, checkOut } = req.body;
      if (!["approved", "rejected"].includes(String(decision || ""))) {
        return res.status(400).json({ message: "decision must be approved or rejected." });
      }

      const record = await Attendance.findById(req.params.id);
      if (!record) {
        return res.status(404).json({ message: "Attendance record not found." });
      }

      record.approvalStatus = decision;
      record.approvedBy = req.user._id;
      record.approvedAt = new Date();
      record.reviewNotes = String(reviewNotes || "").trim();

      if (status && ["present", "absent", "late", "half-day"].includes(status)) {
        record.status = status;
      }

      if (typeof checkIn === "string" && checkIn.trim()) {
        record.checkIn = checkIn.trim();
      }
      if (typeof checkOut === "string" && checkOut.trim()) {
        record.checkOut = checkOut.trim();
      }

      await record.save();
      const populated = await record.populate([
        { path: "employeeId", select: "name department subDepartment role" },
        { path: "approvedBy", select: "name email" },
      ]);

      return res.json({ message: `Attendance ${decision}.`, record: populated });
    } catch (err) {
      return res.status(500).json({ message: "Server error.", error: err.message });
    }
  },
);

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

function buildScopedUserFilter(scopeType, department, subDepartment, userId) {
  if (!scopeType || !["department", "subDepartment", "individual"].includes(scopeType)) {
    return {
      error: "scopeType must be department, subDepartment, or individual.",
    };
  }

  if (scopeType === "department") {
    if (!department || !VALID_DEPARTMENTS.includes(department)) {
      return { error: "A valid department is required." };
    }
    return { filter: { department } };
  }

  if (scopeType === "subDepartment") {
    if (!department || !VALID_DEPARTMENTS.includes(department)) {
      return {
        error: "A valid department is required for sub-department assignment.",
      };
    }

    const validSubs = VALID_SUB_DEPARTMENTS[department] || [];
    if (!subDepartment || !validSubs.includes(subDepartment)) {
      return {
        error: "A valid sub-department is required for the selected department.",
      };
    }

    return { filter: { department, subDepartment } };
  }

  if (!userId) {
    return { error: "userId is required for individual assignment." };
  }

  return { filter: { _id: userId } };
}

// POST /api/salary/assign
app.post(
  "/api/salary/assign",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        scopeType,
        department,
        subDepartment,
        userId,
        monthlySalary,
        lopDeductionPercent,
      } = req.body;

      const scoped = buildScopedUserFilter(
        scopeType,
        department,
        subDepartment,
        userId,
      );
      if (scoped.error) {
        return res.status(400).json({ message: scoped.error });
      }

      const numericFields = {
        monthlySalary,
        lopDeductionPercent,
      };

      for (const [key, value] of Object.entries(numericFields)) {
        if (value === undefined) continue;
        if (!Number.isFinite(Number(value))) {
          return res.status(400).json({ message: `${key} must be a valid number.` });
        }
      }

      if (Number(monthlySalary) < 0) {
        return res.status(400).json({ message: "monthlySalary cannot be negative." });
      }
      if (Number(lopDeductionPercent) < 0 || Number(lopDeductionPercent) > 100) {
        return res.status(400).json({ message: "lopDeductionPercent must be between 0 and 100." });
      }

      const patch = {
        monthlySalary: Number(monthlySalary),
        lopDeductionPercent: Number(lopDeductionPercent),
      };

      const result = await User.updateMany(scoped.filter, { $set: patch });
      const matchedCount = result.matchedCount || 0;
      const modifiedCount = result.modifiedCount || 0;

      if (!matchedCount) {
        return res.status(404).json({ message: "No users matched the selected scope." });
      }

      return res.json({
        message: "Salary assignment updated successfully.",
        scopeType,
        matchedCount,
        modifiedCount,
      });
    } catch (err) {
      return res.status(500).json({ message: "Server error.", error: err.message });
    }
  },
);

// POST /api/leaves/policy/assign
app.post(
  "/api/leaves/policy/assign",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        scopeType,
        department,
        subDepartment,
        userId,
        monthlySickLeave,
        monthlyAnnualLeave,
      } = req.body;

      const scoped = buildScopedUserFilter(
        scopeType,
        department,
        subDepartment,
        userId,
      );
      if (scoped.error) {
        return res.status(400).json({ message: scoped.error });
      }

      if (!Number.isFinite(Number(monthlySickLeave)) || !Number.isFinite(Number(monthlyAnnualLeave))) {
        return res.status(400).json({
          message: "monthlySickLeave and monthlyAnnualLeave must be valid numbers.",
        });
      }

      if (Number(monthlySickLeave) < 0 || Number(monthlyAnnualLeave) < 0) {
        return res.status(400).json({
          message: "Monthly leave allotments cannot be negative.",
        });
      }

      const users = await User.find(scoped.filter);
      if (!users.length) {
        return res.status(404).json({ message: "No users matched the selected scope." });
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      let modifiedCount = 0;

      for (const user of users) {
        const oldSick = Number(user.monthlyLeaveAllocation?.sickLeave || 0);
        const oldAnnual = Number(user.monthlyLeaveAllocation?.annualLeave || 0);
        const nextSick = Number(monthlySickLeave);
        const nextAnnual = Number(monthlyAnnualLeave);

        user.monthlyLeaveAllocation = {
          sickLeave: nextSick,
          annualLeave: nextAnnual,
        };

        // Keep this month's used-leave impact intact by applying only allocation delta.
        if (
          Number(user.currentMonthLeaves?.year) === currentYear &&
          Number(user.currentMonthLeaves?.month) === currentMonth
        ) {
          const sickDelta = nextSick - oldSick;
          const annualDelta = nextAnnual - oldAnnual;

          user.currentMonthLeaves.sickLeave = Math.max(
            0,
            Number(user.currentMonthLeaves.sickLeave || 0) + sickDelta,
          );
          user.currentMonthLeaves.annualLeave = Math.max(
            0,
            Number(user.currentMonthLeaves.annualLeave || 0) + annualDelta,
          );
        }

        await user.save();
        modifiedCount += 1;
      }

      return res.json({
        message: "Leave policy assignment updated successfully.",
        scopeType,
        matchedCount: users.length,
        modifiedCount,
      });
    } catch (err) {
      return res.status(500).json({ message: "Server error.", error: err.message });
    }
  },
);

// ── Enhanced Leave Management ──────────────────────────────

// Monthly Leave Allocation (Cron job simulation - to be called monthly)
async function allocateMonthlyLeaves() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  try {
    const users = await User.find({ status: 'Active' });

    for (const user of users) {
      // Check if allocation already done for current month
      if (user.currentMonthLeaves.year === currentYear &&
          user.currentMonthLeaves.month === currentMonth) {
        continue;
      }

      // Carry forward unused leaves from previous month (if not December to January)
      let carryForwardSick = 0;
      let carryForwardAnnual = 0;

      if (currentMonth > 1 || (currentMonth === 1 && currentDate.getFullYear() > user.currentMonthLeaves.year)) {
        // Don't carry forward from December to January (new year)
        if (!(currentMonth === 1 && user.currentMonthLeaves.month === 12)) {
          carryForwardSick = user.currentMonthLeaves.sickLeave;
          carryForwardAnnual = user.currentMonthLeaves.annualLeave;
        }
      }

      // Update monthly allocation
      user.currentMonthLeaves = {
        year: currentYear,
        month: currentMonth,
        sickLeave: user.monthlyLeaveAllocation.sickLeave + carryForwardSick,
        annualLeave: user.monthlyLeaveAllocation.annualLeave + carryForwardAnnual,
        carryForwardSick,
        carryForwardAnnual
      };

      await user.save();
    }

    console.log(`✅ Monthly leave allocation completed for ${currentMonth}/${currentYear}`);
  } catch (error) {
    console.error('❌ Monthly leave allocation failed:', error);
  }
}

function ensureUserMonthlyLeaveAllocation(user, targetYear, targetMonth) {
  const currentYear = Number(user.currentMonthLeaves?.year || 0);
  const currentMonth = Number(user.currentMonthLeaves?.month || 0);

  if (currentYear === targetYear && currentMonth === targetMonth) {
    return false;
  }

  const isYearReset =
    targetMonth === 1 && currentMonth === 12 && targetYear === currentYear + 1;

  const carryForwardSick = isYearReset
    ? 0
    : Number(user.currentMonthLeaves?.sickLeave || 0);
  const carryForwardAnnual = isYearReset
    ? 0
    : Number(user.currentMonthLeaves?.annualLeave || 0);

  user.currentMonthLeaves = {
    year: targetYear,
    month: targetMonth,
    sickLeave:
      Number(user.monthlyLeaveAllocation?.sickLeave || 0) + carryForwardSick,
    annualLeave:
      Number(user.monthlyLeaveAllocation?.annualLeave || 0) + carryForwardAnnual,
    carryForwardSick,
    carryForwardAnnual,
  };

  return true;
}

// Calculate LOP for a user based on leave taken in current month
async function calculateLOP(userId, month, year) {
  try {
    const user = await User.findById(userId);
    if (!user) return { error: 'User not found' };

    ensureUserMonthlyLeaveAllocation(user, Number(year), Number(month));

    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-31`;
    const monthStartDate = new Date(monthStart);
    const monthEndDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`);

    // Get all approved leaves that overlap with the month.
    const approvedLeaves = await Leave.find({
      employeeId: userId,
      status: 'approved',
      $or: [
        { startDate: { $gte: monthStart, $lte: monthEnd } },
        { endDate: { $gte: monthStart, $lte: monthEnd } },
      ],
    });

    const absentAttendance = await Attendance.find({
      employeeId: userId,
      status: 'absent',
      date: { $gte: monthStart, $lte: monthEnd },
    });

    let sickDaysUsed = 0;
    let annualDaysUsed = 0;
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const approvedLeaveDateKeys = new Set();

    // Calculate leave usage for the selected month and build a leave-day set.
    for (const leave of approvedLeaves) {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);

      const overlapStart = startDate > monthStartDate ? startDate : monthStartDate;
      const overlapEnd = endDate < monthEndDate ? endDate : monthEndDate;
      if (overlapEnd < overlapStart) continue;

      const daysDiff = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;

      if (leave.type === 'sick') {
        sickDaysUsed += daysDiff;
      } else if (leave.type === 'annual') {
        annualDaysUsed += daysDiff;
      }

      for (
        let d = new Date(overlapStart);
        d <= overlapEnd;
        d.setDate(d.getDate() + 1)
      ) {
        const dateKey = d.toISOString().split('T')[0];
        approvedLeaveDateKeys.add(dateKey);
      }
    }

    const availableSick = user.currentMonthLeaves.sickLeave;
    const availableAnnual = user.currentMonthLeaves.annualLeave;

    let lopDays = 0;

    // Check sick leave overflow
    if (sickDaysUsed > availableSick) {
      lopDays += (sickDaysUsed - availableSick);
    }

    // Check annual leave overflow
    if (annualDaysUsed > availableAnnual) {
      lopDays += (annualDaysUsed - availableAnnual);
    }

    // Add absent attendance days that are not covered by approved leave.
    const absentDates = new Set();
    for (const attendance of absentAttendance) {
      const dateKey = String(attendance.date || '').split('T')[0];
      if (!dateKey || approvedLeaveDateKeys.has(dateKey)) continue;
      absentDates.add(dateKey);
    }
    const absentLopDays = absentDates.size;
    lopDays += absentLopDays;

    // Calculate LOP amount
    const dailySalary = user.monthlySalary / totalDaysInMonth;
    const lopAmount = lopDays * dailySalary * (user.lopDeductionPercent / 100);

    // Update user LOP details
    user.lopDetails.currentMonth = lopDays;
    if (month === 1) {
      user.lopDetails.yearToDate = lopDays; // Reset for new year
    } else {
      user.lopDetails.yearToDate += lopDays;
    }
    user.lopDetails.deductionAmount = lopAmount;

    // Update salary components
    user.salaryComponents.basicSalary = user.monthlySalary;
    user.salaryComponents.lopDeduction = lopAmount;
    user.salaryComponents.netSalary = user.monthlySalary - lopAmount - user.salaryComponents.deductions;

    await user.save();

    return {
      lopDays,
      lopAmount,
      sickDaysUsed,
      annualDaysUsed,
      absentDays: absentLopDays,
      availableSick,
      availableAnnual
    };

  } catch (error) {
    return { error: error.message };
  }
}

// API: Trigger monthly leave allocation (Admin only)
app.post("/api/leaves/allocate-monthly", authenticateToken, requireAdmin, async (req, res) => {
  try {
    await allocateMonthlyLeaves();
    res.json({ message: "Monthly leave allocation completed successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to allocate monthly leaves.", error: error.message });
  }
});

// API: Get user's current month leave summary
app.get("/api/leaves/summary", authenticateToken, async (req, res) => {
  try {
    const userId = req.query.userId || req.user._id.toString();

    // Check if admin is requesting for another user
    if (userId !== req.user._id.toString() && !isAdminRole(req.user)) {
      return res.status(403).json({ message: "Access denied." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Calculate current month LOP
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const lopCalculation = await calculateLOP(userId, currentMonth, currentYear);

    res.json({
      monthlyLeaveAllocation: user.monthlyLeaveAllocation,
      currentMonthLeaves: user.currentMonthLeaves,
      lopDetails: user.lopDetails,
      salaryComponents: user.salaryComponents,
      lopCalculation: lopCalculation.error ? null : lopCalculation
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
});

// API: Get detailed salary slip for user
app.get("/api/salary/slip", authenticateToken, async (req, res) => {
  try {
    const userId = req.query.userId || req.user._id.toString();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Check permissions
    if (userId !== req.user._id.toString() && !isAdminRole(req.user)) {
      return res.status(403).json({ message: "Access denied." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Get leave details for the month
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-31`;

    const leaves = await Leave.find({
      employeeId: userId,
      status: 'approved',
      $or: [
        { startDate: { $gte: monthStart, $lte: monthEnd } },
        { endDate: { $gte: monthStart, $lte: monthEnd } }
      ]
    });

    const lopCalculation = await calculateLOP(userId, month, year);

    const salarySlip = {
      employee: {
        name: user.name,
        email: user.email,
        department: user.department,
        subDepartment: user.subDepartment
      },
      period: {
        month,
        year,
        daysInMonth: new Date(year, month, 0).getDate()
      },
      salary: {
        basicSalary: user.monthlySalary,
        allowances: user.salaryComponents.allowances || 0,
        grossSalary: user.monthlySalary + (user.salaryComponents.allowances || 0)
      },
      deductions: {
        standardDeductions: user.salaryComponents.deductions || 0,
        lopDeduction: lopCalculation.lopAmount || 0,
        totalDeductions: (user.salaryComponents.deductions || 0) + (lopCalculation.lopAmount || 0)
      },
      leaves: {
        sickLeaveUsed: lopCalculation.sickDaysUsed || 0,
        annualLeaveUsed: lopCalculation.annualDaysUsed || 0,
        lopDays: lopCalculation.lopDays || 0,
        availableSick: lopCalculation.availableSick || 0,
        availableAnnual: lopCalculation.availableAnnual || 0
      },
      netSalary: user.monthlySalary + (user.salaryComponents.allowances || 0) -
                 ((user.salaryComponents.deductions || 0) + (lopCalculation.lopAmount || 0)),
      leaveDetails: leaves
    };

    res.json(salarySlip);
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
});

// API: Update user salary components (Admin only)
app.post("/api/salary/update", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, basicSalary, allowances, deductions, lopDeductionPercent } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const updateData = {};
    if (basicSalary !== undefined) {
      updateData.monthlySalary = Number(basicSalary);
      updateData['salaryComponents.basicSalary'] = Number(basicSalary);
    }
    if (allowances !== undefined) {
      updateData['salaryComponents.allowances'] = Number(allowances);
    }
    if (deductions !== undefined) {
      updateData['salaryComponents.deductions'] = Number(deductions);
    }
    if (lopDeductionPercent !== undefined) {
      updateData.lopDeductionPercent = Number(lopDeductionPercent);
    }

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
    if (!user) return res.status(404).json({ message: "User not found." });

    res.json({ message: "Salary components updated successfully.", user: user });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
});

// API: Get calendar data with LOP marking
app.get("/api/calendar", authenticateToken, async (req, res) => {
  try {
    const userId = req.query.userId || req.user._id.toString();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Check permissions
    if (userId !== req.user._id.toString() && !isAdminRole(req.user)) {
      return res.status(403).json({ message: "Access denied." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Get all leaves for the month
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-31`;

    const leaves = await Leave.find({
      employeeId: userId,
      $or: [
        { startDate: { $gte: monthStart, $lte: monthEnd } },
        { endDate: { $gte: monthStart, $lte: monthEnd } }
      ]
    });

    const lopCalculation = await calculateLOP(userId, month, year);

    // Build calendar data
    const calendarData = {
      month,
      year,
      leaves: leaves,
      lopInfo: {
        lopDays: lopCalculation.lopDays || 0,
        lopAmount: lopCalculation.lopAmount || 0,
        dailySalary: user.monthlySalary / new Date(year, month, 0).getDate()
      },
      leaveBalance: {
        sickLeave: (lopCalculation.availableSick || 0) - (lopCalculation.sickDaysUsed || 0),
        annualLeave: (lopCalculation.availableAnnual || 0) - (lopCalculation.annualDaysUsed || 0)
      }
    };

    res.json(calendarData);
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
