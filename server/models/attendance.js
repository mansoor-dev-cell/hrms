const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // Format YYYY-MM-DD
    checkIn: { type: String, default: "--:--" }, // Format HH:MM AM/PM
    checkOut: { type: String, default: "--:--" },
    status: { type: String, enum: ["present", "absent", "late", "half-day"], default: "present" },
    notes: { type: String, default: "" }
}, { timestamps: true });

// Prevent duplicate attendance records for the same employee on the same date
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
