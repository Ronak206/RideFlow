function CurrentRide({
  currentTrip,
  startingTrip,
  cancellingTrip,
  completingTrip,
  handleStartTrip,
  handleCancelTrip,
  handleCompleteTrip,
  openLiveRide,
}) {
  return (
    <section className="active-trip">
      <h2>Current Ride</h2>

      <p>
        <strong>Status:</strong> {currentTrip.status}
      </p>

      <p>
        <strong>Distance:</strong> {currentTrip.distanceKm ?? "N/A"} km
      </p>

      <p>
        <strong>Price:</strong> ₹{currentTrip.price}
      </p>

      {currentTrip.user && (
        <>
          <p>
            <strong>Rider:</strong> {currentTrip.user.name || "N/A"}
          </p>

          <p>
            <strong>Rider Email:</strong> {currentTrip.user.email || "N/A"}
          </p>
        </>
      )}

      {currentTrip.status === "accepted" && (
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

      {currentTrip.status === "ongoing" && (
        <div className="current-ride-action">
          <div className="current-ride-label ongoing">
            <span className="current-ride-dot"></span>
            <span>Ride is currently ongoing</span>
          </div>

          <button
            type="button"
            className="ongoing-trip-button"
            onClick={() => openLiveRide(currentTrip._id)}
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
            disabled={cancellingTrip || completingTrip}
          >
            {cancellingTrip ? "Cancelling..." : "Cancel Trip"}
          </button>
        </div>
      )}
    </section>
  );
}

export default CurrentRide;
