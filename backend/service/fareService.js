const BASE_FARE = 25;
const PRICE_PER_KM = 6;

async function calculateTripFare(source, destination) {
  const sourceLongitude = source.coordinates[0];

  const sourceLatitude = source.coordinates[1];

  const destinationLongitude = destination.coordinates[0];

  const destinationLatitude = destination.coordinates[1];

  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${sourceLongitude},${sourceLatitude};` +
    `${destinationLongitude},${destinationLatitude}` +
    `?overview=false`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Unable to calculate road distance");
  }

  const data = await response.json();

  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("No driving route found");
  }

  // OSRM returns distance in meters
  const distanceMeters = data.routes[0].distance;

  const distanceKm = distanceMeters / 1000;

  const fare = BASE_FARE + distanceKm * PRICE_PER_KM;

  return {
    distanceKm: Number(distanceKm.toFixed(2)),

    price: Number(fare.toFixed(2)),
  };
}

module.exports = {
  calculateTripFare,
};
