const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "employee"],
      default: "employee",
    },
    department: {
      type: String,
      enum: ["Sophia Academy", "Global Online College"],
      default: "Sophia Academy",
    },
    subDepartment: { type: String, default: "Teaching Staff" },
    monthlySalary: { type: Number, min: 0, default: 0 },
    annualLeaveQuota: { type: Number, min: 0, default: 0 },
    sickLeaveQuota: { type: Number, min: 0, default: 0 },
    lopQuota: { type: Number, min: 0, default: 0 },
    lopDeductionPercent: { type: Number, min: 0, max: 100, default: 100 },
    joinDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["Active", "On Leave", "Onboarding", "Inactive"],
      default: "Active",
    },
    resetTokenHash: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
