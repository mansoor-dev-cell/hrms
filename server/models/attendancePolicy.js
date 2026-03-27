const mongoose = require("mongoose");

const attendancePolicySchema = new mongoose.Schema(
  {
    officeName: { type: String, default: "Main Office" },
    officeLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    geofenceRadiusMeters: { type: Number, min: 10, default: 200 },
    lateAfter: { type: String, default: "09:30" },
    isLocationEnforced: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AttendancePolicy", attendancePolicySchema);
