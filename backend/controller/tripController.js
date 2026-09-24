const Trip = require("../model/trip");
const Driver = require("../model/driver");
const { calculateTripFare } = require("../service/fareService");
const { getLiveTrip, deleteLiveTrip } = require("../service/liveTripService");
const { findNearbyDrivers } = require("../service/nearbyDriverService");

async function HandleCreateTrip(req, res) {
  try {
    const { source, destination } = req.body;

    // Basic validation

    if (!source || !destination) {
      return res.status(400).json({
        message: "Source and destination are required",
      });
    }

    if (
      source.type !== "Point" ||
      !Array.isArray(source.coordinates) ||
      source.coordinates.length !== 2
    ) {
      return res.status(400).json({
        message: "Invalid source coordinates",
      });
    }

    if (
      destination.type !== "Point" ||
      !Array.isArray(destination.coordinates) ||
      destination.coordinates.length !== 2
    ) {
      return res.status(400).json({
        message: "Invalid destination coordinates",
      });
    }

    const [sourceLongitude, sourceLatitude] = source.coordinates;

    const [destinationLongitude, destinationLatitude] = destination.coordinates;

    // Validate source latitude and longitude

    if (
      sourceLongitude < -180 ||
      sourceLongitude > 180 ||
      sourceLatitude < -90 ||
      sourceLatitude > 90
    ) {
      return res.status(400).json({
        message: "Invalid source longitude or latitude",
      });
    }

    // Validate destination latitude and longitude

    if (
      destinationLongitude < -180 ||
      destinationLongitude > 180 ||
      destinationLatitude < -90 ||
      destinationLatitude > 90
    ) {
      return res.status(400).json({
        message: "Invalid destination longitude or latitude",
      });
    }

    const userId = req.user._id;

    // Check if rider already has an active trip

    const existingTrip = await Trip.findOne({
      user: userId,

      status: {
        $in: ["requested", "accepted", "ongoing"],
      },
    });

    if (existingTrip) {
      return res.status(409).json({
        message: "You already have an active trip",
      });
    }

    // Calculate actual road distance and fare

    const { distanceKm, price } = await calculateTripFare(source, destination);

    const trip = await Trip.create({
      user: userId,

      driver: null,

      source: {
        type: "Point",
        coordinates: source.coordinates,
      },

      destination: {
        type: "Point",
        coordinates: destination.coordinates,
      },

      distanceKm,

      price,

      status: "requested",
    });

    // Find online drivers near pickup

    const nearbyDrivers = await findNearbyDrivers(
      {
        type: "Point",
        coordinates: source.coordinates,
      },
      5,
    );

    // Get Socket.IO instance

    const io = req.app.get("io");

    if (io && nearbyDrivers.length > 0) {
      const tripRequest = {
        trip: {
          _id: trip._id,

          source: trip.source,

          destination: trip.destination,

          distanceKm: trip.distanceKm,

          price: trip.price,

          status: trip.status,
        },
      };

      // Notify only nearby drivers

      nearbyDrivers.forEach((driver) => {
        io.to(`driver:${driver._id.toString()}`).emit(
          "new-trip-request",
          tripRequest,
        );
      });
    }

    return res.status(201).json({
      message: "Trip requested successfully",

      nearbyDriverCount: nearbyDrivers.length,

      trip,
    });
  } catch (error) {
    console.error("Create Trip Error:", error);

    // Active trip already exists

    if (error.code === 11000) {
      return res.status(409).json({
        message: "You already have an active trip",
      });
    }

    if (error.message === "Unable to calculate road distance") {
      return res.status(502).json({
        message: "Unable to calculate trip distance",
      });
    }

    if (error.message === "No driving route found") {
      return res.status(400).json({
        message: "No driving route found between the selected locations",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function HandleDeleteTrip(req, res) {
  try {
    const { tripId } = req.body;

    if (!tripId) {
      return res.status(400).json({
        message: "tripId is required",
      });
    }

    const deletedTrip = await Trip.findByIdAndDelete(tripId);

    return res.status(200).json({
      message: "Trip deleted",
      deletedTrip,
    });
  } catch {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function HandleShowTrip(req, res) {
  try {
    // Only drivers should use this endpoint

    if (req.user.role !== "driver") {
      return res.status(403).json({
        message: "Only drivers can view available trips",
      });
    }

    // Find driver profile

    const driver = await Driver.findOne({
      user: req.user._id,
    });

    if (!driver) {
      return res.status(404).json({
        message: "Driver not found",
      });
    }

    // Offline driver should not receive rides

    if (driver.status !== "online") {
      return res.status(200).json({
        message: "Driver is offline",
        trips: [],
      });
    }

    // Driver must have a current location

    if (
      !driver.lastLocation ||
      driver.lastLocation.type !== "Point" ||
      !Array.isArray(driver.lastLocation.coordinates) ||
      driver.lastLocation.coordinates.length !== 2
    ) {
      return res.status(200).json({
        message: "Driver location not available",
        trips: [],
      });
    }

    // Find requested trips within 5 km
    // of the driver's current location

    const trips = await Trip.find({
      status: "requested",

      driver: null,

      source: {
        $near: {
          $geometry: driver.lastLocation,

          $maxDistance: 5000,
        },
      },
    });

    return res.status(200).json({
      message: "Available trips",

      trips,
    });
  } catch (error) {
    console.error("Show Trip Error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function HandleAcceptTrip(req, res) {
  try {
    const { tripId } = req.body;

    if (!tripId) {
      return res.status(422).json({
        message: "Trip is required",
      });
    }

    // Find driver using authenticated user

    const driver = await Driver.findOne({
      user: req.user._id,
    });

    if (!driver) {
      return res.status(404).json({
        message: "Driver not found",
      });
    }

    const driverId = driver._id;

    // Check accepted or ongoing trips

    const activeTrip = await Trip.findOne({
      driver: driverId,
      status: {
        $in: ["accepted", "ongoing"],
      },
    });

    if (activeTrip) {
      return res.status(409).json({
        message: "You already have an active ride",
      });
    }

    // Accept requested trip

    const trip = await Trip.findOneAndUpdate(
      {
        _id: tripId,
        driver: null,
        status: "requested",
      },

      {
        $set: {
          driver: driverId,
          status: "accepted",
        },
      },

      {
        new: true,
      },
    );

    if (!trip) {
      return res.status(409).json({
        message: "Trip is already assigned or unavailable",
      });
    }

    const acceptedTrip = await Trip.findById(trip._id).populate(
      "user",
      "name email",
    );

    return res.status(200).json({
      message: "Trip Accepted",

      trip: acceptedTrip,
    });
  } catch (error) {
    console.error("Accept Trip Error:", error);

    // MongoDB duplicate active-driver protection

    if (error.code === 11000) {
      return res.status(409).json({
        message: "You already have an active ride",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function HandleGetDriverTrip(req, res) {
  try {
    const driverId = req.params.id;

    if (!driverId) {
      return res.status(400).json({
        message: "Driver ID is required",
      });
    }

    const trips = await Trip.find({
      driver: driverId,
    }).populate("user", "name email");

    return res.status(200).json({
      message: "All trips for driver",
      trips,
    });
  } catch (error) {
    console.error("Get Driver Trip Error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function HandleTripHistory(req, res) {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const trip = await Trip.find({
      user: userId,
      status: {
        $in: ["cancelled", "completed"],
      },
    });

    if (!trip) {
      return res.status(409).json({
        message: "No Trip",
      });
    }

    return res.status(200).json({
      message: "Trip fetch",
      trip,
    });
  } catch {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function HandleCurrentTrip(req, res) {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    const trip = await Trip.findOne({
      user: userId,
      status: {
        $in: ["requested", "accepted", "ongoing"],
      },
    });

    if (!trip) {
      return res.status(200).json({
        message: "No current trip",
        trip: null,
      });
    }

    return res.status(200).json({
      message: "Current Trip",
      trip,
    });
  } catch (error) {
    console.error("Current Trip Error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function HandleStartTrip(req, res) {
  try {
    const { tripId } = req.body;

    if (!tripId) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    const trip = await Trip.findById(tripId);

    trip.status = "ongoing";
    trip.save();

    return res.status(200).json({
      message: "Start Trip",
      trip,
    });
  } catch {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function HandleCurrentLiveTrip(req, res) {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    let trip = null;

    // Rider's ongoing trip

    if (req.user.role === "rider") {
      trip = await Trip.findOne({
        user: userId,
        status: "ongoing",
      });
    }

    // Driver's ongoing trip

    if (req.user.role === "driver") {
      const driver = await Driver.findOne({
        user: userId,
      });

      if (driver) {
        trip = await Trip.findOne({
          driver: driver._id,
          status: "ongoing",
        });
      }
    }

    if (!trip) {
      return res.status(404).json({
        message: "No ongoing trip found",
      });
    }

    const liveTrip = await getLiveTrip(trip._id.toString());

    if (!liveTrip) {
      return res.status(404).json({
        message: "Live trip location not available",
      });
    }

    return res.status(200).json({
      message: "Live trip data",

      liveTrip: {
        location: {
          latitude: liveTrip.latitude,

          longitude: liveTrip.longitude,
        },

        route: liveTrip.route,

        distanceKm: liveTrip.distanceKm,

        updatedAt: liveTrip.updatedAt,
      },
    });
  } catch (error) {
    console.error("Current live trip error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function HandleCancelCurrentTrip(req, res) {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    let trip = null;

    // Rider cancels current trip

    if (req.user.role === "rider") {
      trip = await Trip.findOne({
        user: userId,

        status: {
          $in: ["accepted", "ongoing", "requested"],
        },
      });
    }

    // Driver cancels current trip

    if (req.user.role === "driver") {
      const driver = await Driver.findOne({
        user: userId,
      });

      if (!driver) {
        return res.status(404).json({
          message: "Driver not found",
        });
      }

      trip = await Trip.findOne({
        driver: driver._id,

        status: {
          $in: ["accepted", "ongoing"],
        },
      });
    }

    if (!trip) {
      return res.status(404).json({
        message: "No cancellable trip found",
      });
    }

    trip.status = "cancelled";

    await trip.save();

    // Remove live trip data from Redis

    await deleteLiveTrip(trip._id.toString());

    return res.status(200).json({
      message: "Trip cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel Trip Error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function HandleCompleteTrip(req, res) {
  try {
    if (req.user.role !== "driver") {
      return res.status(403).json({
        message: "Only driver can complete trip",
      });
    }

    const { tripId } = req.body;

    if (!tripId) {
      return res.status(400).json({
        message: "Trip ID is required",
      });
    }

    const driver = await Driver.findOne({
      user: req.user._id,
    });

    if (!driver) {
      return res.status(404).json({
        message: "Driver not found",
      });
    }

    const trip = await Trip.findOneAndUpdate(
      {
        _id: tripId,
        driver: driver._id,
        status: "ongoing",
      },
      {
        $set: {
          status: "completed",
        },
      },
      {
        new: true,
      },
    );

    if (!trip) {
      const existingTrip = await Trip.findOne({
        _id: tripId,
        driver: driver._id,
      });

      if (existingTrip && existingTrip.status === "completed") {
        return res.status(200).json({
          message: "Trip already completed",
          trip: existingTrip,
        });
      }

      return res.status(404).json({
        message: "No ongoing trip found",
      });
    }

    // Remove live trip data from Redis

    await deleteLiveTrip(trip._id.toString());

    // Notify rider and driver

    const io = req.app.get("io");

    if (io) {
      io.to(`trip:${trip._id.toString()}`).emit("trip-completed", {
        trip,
        reason: "driver",
      });
    }

    return res.status(200).json({
      message: "Trip completed successfully",
      trip,
    });
  } catch (error) {
    console.error("Complete Trip Error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

module.exports = {
  HandleCreateTrip,
  HandleShowTrip,
  HandleAcceptTrip,
  HandleGetDriverTrip,
  HandleTripHistory,
  HandleCurrentTrip,
  HandleStartTrip,
  HandleDeleteTrip,
  HandleCurrentLiveTrip,
  HandleCancelCurrentTrip,
  HandleCompleteTrip,
};
