const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "employee", "hr", "manager"], default: "employee" },
  department: { type: String, default: "General" },
  joinDate: { type: Date, default: Date.now },
  status: { type: String, enum: ["Active", "On Leave", "Onboarding", "Inactive"], default: "Active" }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
