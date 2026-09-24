const Driver = require("../model/driver");

const { getUser } = require("../service/auth");

const { findNearbyDrivers } = require("../service/nearbyDriverService");

// ==========================================
// GET DRIVER
// ==========================================

async function handleGetDriver(req, res) {
  try {
    const token = req.cookies.uid;

    if (!token) {
      return res.status(401).json({
        message: "No token provided, please login",
      });
    }

    const user = getUser(token);

    if (!user) {
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }

    if (user.role !== "driver") {
      return res.status(403).json({
        message: "Only drivers can access driver profile",
      });
    }

    const driver = await Driver.findOne({
      user: user._id,
    });

    if (!driver) {
      return res.status(404).json({
        message: "Driver profile not found",
      });
    }

    return res.status(200).json({
      message: "Driver Found.",

      driver: {
        id: driver._id,

        name: user.name,

        email: user.email,

        vehicleName: driver.vehicleName,

        vehicleNumber: driver.vehicleNumber,

        status: driver.status || "offline",

        rating: driver.rating ?? 0,

        lastLocation: driver.lastLocation || null,
      },
    });
  } catch (error) {
    console.error("Get Driver Error:", error);

    return res.status(500).json({
      message: "Server error",

      error: error.message,
    });
  }
}

// ==========================================
// UPDATE DRIVER
// ==========================================

async function handleUpdateDriver(req, res) {
  try {
    const { lastLocation, status, rating, vehicleName, vehicleNumber } =
      req.body;

    const updates = {};

    if (lastLocation) {
      updates.lastLocation = lastLocation;
    }

    if (status) {
      updates.status = status;
    }

    if (rating !== undefined) {
      updates.rating = rating;
    }

    if (vehicleName) {
      updates.vehicleName = vehicleName;
    }

    if (vehicleNumber) {
      updates.vehicleNumber = vehicleNumber;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No fields to update",
      });
    }

    const token = req.cookies.uid;

    if (!token) {
      return res.status(401).json({
        message: "No token provided, please login",
      });
    }

    const user = getUser(token);

    const driver = await Driver.findOne({
      user: user._id,
    });

    if (!driver) {
      return res.status(404).json({
        message: "No Driver Found",
      });
    }

    await Driver.findByIdAndUpdate(
      driver._id,

      updates,

      {
        new: true,
      },
    );

    return res.status(200).json({
      message: "Driver updated",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",

      error: error.message,
    });
  }
}

// ==========================================
// DELETE DRIVER
// ==========================================

async function handleDeleteDriver(req, res) {
  try {
    const token = req.cookies.uid;

    if (!token) {
      return res.status(401).json({
        message: "No token provided, please login",
      });
    }

    const user = getUser(token);

    const driver = await Driver.findOne({
      user: user._id,
    });

    if (!driver) {
      return res.status(404).json({
        message: "No Driver Found",
      });
    }

    await Driver.findByIdAndDelete(driver._id);

    return res.status(200).json({
      message: "Driver deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",

      error: error.message,
    });
  }
}

// ==========================================
// UPDATE DRIVER STATUS
// ==========================================

async function handleUpdateDriverStatus(req, res) {
  try {
    const { status } = req.body;

    if (status !== "online" && status !== "offline") {
      return res.status(400).json({
        message: "Status must be online or offline",
      });
    }

    const token = req.cookies.uid;

    if (!token) {
      return res.status(401).json({
        message: "No token provided, please login",
      });
    }

    const user = getUser(token);

    if (!user) {
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }

    const driver = await Driver.findOne({
      user: user._id,
    });

    if (!driver) {
      return res.status(404).json({
        message: "No Driver Found",
      });
    }

    driver.status = status;

    await driver.save();

    return res.status(200).json({
      message: "Status updated",

      status: driver.status,

      driver: {
        id: driver._id,

        status: driver.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",

      error: error.message,
    });
  }
}

// ==========================================
// GET NEARBY DRIVERS
// ==========================================

async function handleGetNearbyDrivers(req, res) {
  try {
    const token = req.cookies.uid;

    if (!token) {
      return res.status(401).json({
        message: "No token provided, please login",
      });
    }

    const user = getUser(token);

    if (!user) {
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }

    const latitude = Number(req.query.latitude);

    const longitude = Number(req.query.longitude);

    const radius =
      req.query.radius !== undefined ? Number(req.query.radius) : 5;

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({
        message: "Latitude and longitude are required",
      });
    }

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        message: "Invalid latitude or longitude",
      });
    }

    if (Number.isNaN(radius) || radius <= 0) {
      return res.status(400).json({
        message: "Invalid radius",
      });
    }

    const drivers = await findNearbyDrivers(
      {
        type: "Point",

        coordinates: [longitude, latitude],
      },

      radius,
    );

    const nearbyDrivers = drivers.map((driver) => ({
      id: driver._id,

      status: driver.status,

      vehicleName: driver.vehicleName,

      vehicleNumber: driver.vehicleNumber,

      rating: driver.rating ?? 0,

      lastLocation: driver.lastLocation,
    }));

    return res.status(200).json({
      message: "Nearby drivers found",

      count: nearbyDrivers.length,

      drivers: nearbyDrivers,
    });
  } catch (error) {
    if (error.message === "Invalid location") {
      return res.status(400).json({
        message: "Invalid location",
      });
    }

    if (error.message === "Invalid location coordinates") {
      return res.status(400).json({
        message: "Invalid location coordinates",
      });
    }

    if (error.message === "Invalid radius") {
      return res.status(400).json({
        message: "Invalid radius",
      });
    }

    return res.status(500).json({
      message: "Server error",

      error: error.message,
    });
  }
}

module.exports = {
  handleGetDriver,
  handleUpdateDriver,
  handleDeleteDriver,
  handleUpdateDriverStatus,
  handleGetNearbyDrivers,
};
