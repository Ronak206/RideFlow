function MyRides({
  driverTrips,
  currentTripId,
  startingTrip,
  cancellingTrip,
  handleStartTrip,
  handleCancelTrip,
  openLiveRide,
  completingTrip,
  handleCompleteTrip,
}) {
  return (
    <section className="driver-trips">
      <h2>My Rides</h2>

      {driverTrips.length === 0 ? (
        <p>You haven't accepted any rides yet.</p>
      ) : (
        <div className="trip-list">
          {driverTrips.map((trip) => (
            <div className="trip-card" key={trip._id}>
              <h3>My Ride</h3>

              <p>
                <strong>Status:</strong> {trip.status}
              </p>

              <p>
                <strong>Distance:</strong> {trip.distanceKm ?? "N/A"} km
              </p>

              <p>
                <strong>Price:</strong> ₹{trip.price}
              </p>

              {trip.user && (
                <>
                  <p>
                    <strong>Rider:</strong> {trip.user.name || "N/A"}
                  </p>

                  <p>
                    <strong>Rider Email:</strong> {trip.user.email || "N/A"}
                  </p>
                </>
              )}

              {/* Current accepted ride */}

              {trip._id === currentTripId && trip.status === "accepted" && (
                <div className="current-ride-action">
                  <div className="current-ride-label">
                    <span className="current-ride-dot"></span>

                    <span>This is your current ride</span>
                  </div>

                  <button
                    type="button"
                    className="start-trip-button"
                    onClick={handleStartTrip}
                    disabled={startingTrip || cancellingTrip}
                  >
                    {startingTrip ? "Starting Ride..." : "🚗 Start Ride"}
                  </button>

                  <button
                    type="button"
                    className="cancel-trip-button"
                    onClick={handleCancelTrip}
                    disabled={startingTrip || cancellingTrip}
                  >
                    {cancellingTrip ? "Cancelling..." : "Cancel Trip"}
                  </button>
                </div>
              )}

              {/* Current ongoing ride */}

              {trip._id === currentTripId && trip.status === "ongoing" && (
                <div className="current-ride-action">
                  <div className="current-ride-label ongoing">
                    <span className="current-ride-dot"></span>

                    <span>Ride is currently ongoing</span>
                  </div>

                  <button
                    type="button"
                    className="ongoing-trip-button"
                    onClick={() => openLiveRide(trip._id)}
                    disabled={cancellingTrip}
                  >
                    🚗 Open Live Ride
                  </button>

                  <button
                    type="button"
                    className="complete-trip-button"
                    onClick={handleCompleteTrip}
                    disabled={cancellingTrip || completingTrip}
                  >
                    {completingTrip ? "Completing..." : "✅ Complete Ride"}
                  </button>
                  
                  <button
                    type="button"
                    className="cancel-trip-button"
                    onClick={handleCancelTrip}
                    disabled={cancellingTrip}
                  >
                    {cancellingTrip ? "Cancelling..." : "Cancel Trip"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default MyRides;
