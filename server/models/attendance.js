const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // Format YYYY-MM-DD
    checkIn: { type: String, default: "--:--" }, // Format HH:MM AM/PM
    checkOut: { type: String, default: "--:--" },
    status: { type: String, enum: ["present", "absent", "late", "half-day"], default: "present" },
    notes: { type: String, default: "" },
    approvalStatus: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "approved",
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    reviewNotes: { type: String, default: "" },
    markedVia: { type: String, enum: ["self", "admin"], default: "admin" },
    isAutoApproved: { type: Boolean, default: false },
    markedLocation: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
        accuracy: { type: Number, default: null },
    },
    locationCheck: {
        isMatch: { type: Boolean, default: null },
        distanceMeters: { type: Number, default: null },
        radiusMeters: { type: Number, default: null },
    },
    markedAtTime: { type: String, default: "" }
}, { timestamps: true });

// Prevent duplicate attendance records for the same employee on the same date
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
