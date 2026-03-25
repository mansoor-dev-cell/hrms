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

    // Enhanced monthly leave tracking
    monthlyLeaveAllocation: {
      sickLeave: { type: Number, default: 1 },
      annualLeave: { type: Number, default: 1 },
    },
    currentMonthLeaves: {
      year: { type: Number, default: new Date().getFullYear() },
      month: { type: Number, default: new Date().getMonth() + 1 },
      sickLeave: { type: Number, default: 1 },
      annualLeave: { type: Number, default: 1 },
      carryForwardSick: { type: Number, default: 0 },
      carryForwardAnnual: { type: Number, default: 0 },
    },

    // LOP and salary tracking
    lopDetails: {
      currentMonth: { type: Number, default: 0 },
      yearToDate: { type: Number, default: 0 },
      deductionAmount: { type: Number, default: 0 },
    },
    salaryComponents: {
      basicSalary: { type: Number, default: 0 },
      allowances: { type: Number, default: 0 },
      deductions: { type: Number, default: 0 },
      lopDeduction: { type: Number, default: 0 },
      netSalary: { type: Number, default: 0 },
    },

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
