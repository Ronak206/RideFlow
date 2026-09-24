const { redisClient } = require("./redis");

// Save live trip data

async function saveLiveTrip(tripId, liveTripData) {
  if (!tripId) {
    throw new Error("Trip ID is required");
  }

  const key = `trip:live:${tripId}`;

  await redisClient.set(key, JSON.stringify(liveTripData));

  return liveTripData;
}

// Get live trip data

async function getLiveTrip(tripId) {
  if (!tripId) {
    throw new Error("Trip ID is required");
  }

  const key = `trip:live:${tripId}`;

  const data = await redisClient.get(key);

  if (!data) {
    return null;
  }

  return JSON.parse(data);
}

// Delete live trip data

async function deleteLiveTrip(tripId) {
  if (!tripId) {
    throw new Error("Trip ID is required");
  }

  const key = `trip:live:${tripId}`;

  await redisClient.del(key);
}

module.exports = {
  saveLiveTrip,
  getLiveTrip,
  deleteLiveTrip,
};
