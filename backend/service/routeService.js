async function getRoute(source, destination) {
  const sourceLongitude = source.coordinates[0];

  const sourceLatitude = source.coordinates[1];

  const destinationLongitude = destination.coordinates[0];

  const destinationLatitude = destination.coordinates[1];

  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${sourceLongitude},${sourceLatitude};` +
    `${destinationLongitude},${destinationLatitude}` +
    `?overview=full&geometries=geojson`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Unable to get road route");
  }

  const data = await response.json();

  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("No road route found");
  }

  const route = data.routes[0].geometry.coordinates.map(
    ([longitude, latitude]) => [latitude, longitude],
  );

  const distanceKm = data.routes[0].distance / 1000;

  return {
    route,
    distanceKm: Number(distanceKm.toFixed(2)),
  };
}

module.exports = {
  getRoute,
};
