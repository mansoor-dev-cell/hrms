const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["annual", "sick", "unpaid", "maternity", "lop"],
      required: true,
    },
    startDate: { type: String, required: true }, // YYYY-MM-DD
    endDate: { type: String, required: true }, // YYYY-MM-DD
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // Enhanced LOP and salary tracking
    isLopDeduction: { type: Boolean, default: false },
    lopDays: { type: Number, default: 0 },
    lopAmount: { type: Number, default: 0 },

    // Month and year tracking for carry forward logic
    month: { type: Number },
    year: { type: Number },

    // Metadata
    isCarryForward: { type: Boolean, default: false },
    originalMonth: { type: Number }, // Original month the leave was allocated
    autoCreated: { type: Boolean, default: false }, // If system created (LOP, carry forward)
  },
  { timestamps: true },
);

module.exports = mongoose.model("Leave", leaveSchema);
