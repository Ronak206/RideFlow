const express = require("express");

const router = express.Router();

const {
  handleGetDriver,
  handleUpdateDriver,
  handleDeleteDriver,
  handleUpdateDriverStatus,
  handleGetNearbyDrivers,
} = require("../controller/driverController");

// Get current driver
router.get("/", handleGetDriver);

// Get nearby online drivers
router.get("/nearby", handleGetNearbyDrivers);

// Update driver
router.put("/", handleUpdateDriver);

// Delete driver
router.delete("/", handleDeleteDriver);

// Change driver status
router.patch("/status", handleUpdateDriverStatus);

module.exports = router;
