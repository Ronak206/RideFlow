const Driver = require("../model/driver");

async function findNearbyDrivers(location, radiusKm = 5) {
  if (!location) {
    throw new Error("Location is required");
  }

  if (
    location.type !== "Point" ||
    !Array.isArray(location.coordinates) ||
    location.coordinates.length !== 2
  ) {
    throw new Error("Invalid location");
  }

  const [longitude, latitude] = location.coordinates;

  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    throw new Error("Invalid location coordinates");
  }

  if (typeof radiusKm !== "number" || Number.isNaN(radiusKm) || radiusKm <= 0) {
    throw new Error("Invalid radius");
  }

  const radiusMeters = radiusKm * 1000;

  const drivers = await Driver.find({
    status: "online",

    lastLocation: {
      $near: {
        $geometry: {
          type: "Point",

          coordinates: [longitude, latitude],
        },

        $maxDistance: radiusMeters,
      },
    },
  });

  return drivers;
}

module.exports = {
  findNearbyDrivers,
};
