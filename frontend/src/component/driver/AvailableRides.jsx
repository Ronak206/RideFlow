import RideMap from "../RideMap.jsx";

function AvailableRides({
  trips,
  loadingTrips,
  acceptingTrip,
  handleAcceptTrip,
}) {
  return (
    <section className="available-rides">
      <h2>Available Rides</h2>

      {loadingTrips ? (
        <p>Loading available rides...</p>
      ) : trips.length === 0 ? (
        <p>No rides available right now.</p>
      ) : (
        <div className="trip-list">
          {trips.map((trip) => (
            <div className="trip-card" key={trip._id}>
              <h3>Ride Request</h3>

              <p>
                <strong>Status:</strong> {trip.status}
              </p>

              <p>
                <strong>Distance:</strong> {trip.distanceKm ?? "N/A"} km
              </p>

              <p>
                <strong>Fare:</strong> ₹{trip.price}
              </p>

              <RideMap
                source={trip.source}
                destination={trip.destination}
                route={trip.route || []}
              />

              <button
                type="button"
                className="accept-trip-button"
                onClick={() => handleAcceptTrip(trip._id)}
                disabled={acceptingTrip === trip._id}
              >
                {acceptingTrip === trip._id ? "Accepting..." : "Accept Ride"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default AvailableRides;
