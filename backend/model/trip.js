const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },

    source: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },

      coordinates: {
        type: [Number],
        required: true,
      },
    },

    destination: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },

      coordinates: {
        type: [Number],
        required: true,
      },
    },

    // Distance of the actual road route in kilometers
    distanceKm: {
      type: Number,
      required: true,
      min: 0,
    },

    // Fare calculated by backend
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["requested", "accepted", "ongoing", "completed", "cancelled"],
      default: "requested",
    },
  },

  {
    timestamps: true,
  },
);

// Geospatial indexes
tripSchema.index({ source: "2dsphere" });
tripSchema.index({ destination: "2dsphere" });
// One user can have only one active trip
tripSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: ["requested", "accepted", "ongoing"],
      },
    },
  },
);
// One driver can have only one active trip
tripSchema.index(
  { driver: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: ["accepted", "ongoing"],
      },
    },
  },
);

const Trip = mongoose.model("Trip", tripSchema);

module.exports = Trip;
