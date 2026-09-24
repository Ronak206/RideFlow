const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["online", "offline"],
      default: "offline",
    },

    rating: {
      type: Number,
      min: 0,
    },

    vehicleName: {
      type: String,
    },

    vehicleNumber: {
      type: String,
    },

    lastLocation: {
      type: {
        type: String,
        enum: ["Point"],
      },

      coordinates: {
        type: [Number],
      },
    },
  },
  {
    timestamps: true,
  },
);

// Used for nearby-driver search

driverSchema.index({
  lastLocation: "2dsphere",
});

const Driver = mongoose.model("driver", driverSchema);

module.exports = Driver;
