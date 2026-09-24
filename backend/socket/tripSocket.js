const Driver = require("../model/driver");

const Trip = require("../model/trip");

const { saveLiveTrip, deleteLiveTrip } = require("../service/liveTripService");

const { getRoute } = require("../service/routeService");

// Destination is considered reached
// when remaining road distance is 50 meters or less.

const DESTINATION_REACHED_KM = 0.05;

function registerTripSocket(io) {
  io.on("connection", async (socket) => {
    console.log("Socket authenticated:", socket.user);

    // Put driver into private room

    if (socket.user.role === "driver") {
      try {
        const driver = await Driver.findOne({
          user: socket.user._id,
        });

        if (driver) {
          socket.data.driverId = driver._id;

          socket.join(`driver:${driver._id.toString()}`);
        }
      } catch (error) {
        console.error("Driver room error:", error);
      }
    }

    // Put rider into private room

    if (socket.user.role === "rider") {
      socket.join(`rider:${socket.user._id.toString()}`);
    }

    // Join rider's ongoing trip room

    socket.on("join-live-trip", async () => {
      try {
        const trip = await Trip.findOne({
          user: socket.user._id,

          status: "ongoing",
        });

        if (!trip) {
          return;
        }

        socket.data.tripId = trip._id.toString();

        socket.data.destination = trip.destination;

        socket.join(`trip:${socket.data.tripId}`);
      } catch (error) {
        console.error("Join live trip error:", error);
      }
    });

    // ==========================================
    // RECEIVE DRIVER GPS LOCATION
    // ==========================================

    socket.on("send-location", async (data) => {
      try {
        // Only drivers should send driver location

        if (socket.user.role !== "driver") {
          return;
        }

        // ==========================================
        // VALIDATE GPS
        // ==========================================

        const latitude = Number(data?.latitude);

        const longitude = Number(data?.longitude);

        if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
          return;
        }

        if (
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          return;
        }

        // ==========================================
        // FIND DRIVER
        // ==========================================

        if (!socket.data.driverId) {
          const driver = await Driver.findOne({
            user: socket.user._id,
          });

          if (!driver) {
            return;
          }

          socket.data.driverId = driver._id;

          socket.join(`driver:${driver._id.toString()}`);
        }

        // ==========================================
        // SAVE LATEST DRIVER LOCATION
        // ==========================================

        await Driver.findByIdAndUpdate(socket.data.driverId, {
          $set: {
            lastLocation: {
              type: "Point",

              coordinates: [longitude, latitude],
            },
          },
        });

        // ==========================================
        // FIND DRIVER'S CURRENT ONGOING TRIP
        // ==========================================

        let trip = null;

        // First check the trip stored
        // inside the socket.

        if (socket.data.tripId) {
          trip = await Trip.findOne({
            _id: socket.data.tripId,

            driver: socket.data.driverId,

            status: "ongoing",
          });
        }

        // If the stored trip is no longer ongoing,
        // find the driver's current ongoing trip.

        if (!trip) {
          trip = await Trip.findOne({
            driver: socket.data.driverId,

            status: "ongoing",
          });
        }

        // Driver currently has no ongoing trip.

        if (!trip) {
          socket.data.tripId = null;

          socket.data.destination = null;

          return;
        }

        // ==========================================
        // STORE CURRENT TRIP IN SOCKET
        // ==========================================

        socket.data.tripId = trip._id.toString();

        socket.data.destination = trip.destination;

        socket.join(`trip:${socket.data.tripId}`);

        // ==========================================
        // MAKE SURE DESTINATION EXISTS
        // ==========================================

        if (
          !trip.destination ||
          trip.destination.type !== "Point" ||
          !Array.isArray(trip.destination.coordinates) ||
          trip.destination.coordinates.length !== 2
        ) {
          return;
        }

        // ==========================================
        // CURRENT DRIVER LOCATION
        // ==========================================

        const driverLocation = {
          latitude: latitude,

          longitude: longitude,
        };

        // ==========================================
        // CALCULATE ROAD ROUTE
        // CURRENT LOCATION → DESTINATION
        // ==========================================

        const routeData = await getRoute(
          {
            type: "Point",

            coordinates: [longitude, latitude],
          },

          trip.destination,
        );

        // ==========================================
        // AUTOMATICALLY COMPLETE TRIP
        // WHEN DESTINATION IS REACHED
        // ==========================================

        if (routeData.distanceKm <= DESTINATION_REACHED_KM) {
          const completedTrip = await Trip.findOneAndUpdate(
            {
              _id: trip._id,

              driver: socket.data.driverId,

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

          if (completedTrip) {
            // Remove live trip data
            // from Redis.

            await deleteLiveTrip(completedTrip._id.toString());

            // Notify rider and driver
            // through the trip room.

            io.to(`trip:${completedTrip._id.toString()}`).emit(
              "trip-completed",
              {
                trip: completedTrip,

                reason: "destination",
              },
            );

            // Notify the rider through
            // the rider's private room.

            io.to(`rider:${completedTrip.user.toString()}`).emit(
              "trip-completed",
              {
                trip: completedTrip,

                reason: "destination",
              },
            );

            // Clear socket trip data.

            socket.data.tripId = null;

            socket.data.destination = null;

            // Leave completed trip room.

            socket.leave(`trip:${completedTrip._id.toString()}`);
          }

          // Do not save another live-trip update
          // because this trip is now completed.

          return;
        }

        // ==========================================
        // PREPARE LIVE TRIP DATA
        // ==========================================

        const liveTripData = {
          latitude: driverLocation.latitude,

          longitude: driverLocation.longitude,

          route: routeData.route,

          distanceKm: routeData.distanceKm,

          updatedAt: new Date().toISOString(),
        };

        // ==========================================
        // SAVE LIVE TRIP STATE IN REDIS
        // ==========================================

        await saveLiveTrip(socket.data.tripId, liveTripData);

        console.log("Live trip saved:", liveTripData);

        // ==========================================
        // SEND LIVE UPDATE
        // TO RIDER + DRIVER
        // ==========================================

        io.to(`trip:${socket.data.tripId}`).emit(
          "trip-live-update",
          liveTripData,
        );
      } catch (error) {
        console.error("Live location error:", error);
      }
    });

    // ==========================================
    // SOCKET DISCONNECTED
    // ==========================================

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
}

module.exports = registerTripSocket;
