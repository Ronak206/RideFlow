import RideMap from "../RideMap.jsx";

function LiveRideModal({
  currentTrip,
  liveLocation,
  liveRoute,
  liveDistance,
  liveUpdatedAt,
  liveLocationError,
  closeLiveRide,
}) {
  return (
    <div
      className="live-ride-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closeLiveRide();
        }
      }}
    >
      <div className="live-ride-modal">
        <div className="live-ride-modal-header">
          <div>
            <h2>🚗 Live Ride</h2>

            <p>Trip is currently live</p>
          </div>

          <button
            type="button"
            className="live-ride-close-button"
            onClick={closeLiveRide}
            aria-label="Close live ride"
          >
            ✕
          </button>
        </div>

        <div className="live-ride-status">
          <span className="live-status-dot"></span>

          <strong>Live location</strong>

          <span>GPS location is active</span>
        </div>

        {liveLocationError && (
          <div className="live-location-error">{liveLocationError}</div>
        )}

        <RideMap
          source={currentTrip.source}
          destination={currentTrip.destination}
          driverLocation={liveLocation}
          route={liveRoute}
        />

        {liveLocation && (
          <div className="live-location-info">
            <div>
              <strong>Latitude</strong>

              <span>{liveLocation.latitude}</span>
            </div>

            <div>
              <strong>Longitude</strong>

              <span>{liveLocation.longitude}</span>
            </div>

            {liveDistance !== null && (
              <div>
                <strong>Remaining Distance</strong>

                <span>{liveDistance} km</span>
              </div>
            )}

            {liveUpdatedAt && (
              <div>
                <strong>Last Updated</strong>

                <span>{new Date(liveUpdatedAt).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        )}

        {!liveLocation && !liveLocationError && (
          <div className="live-location-loading">Waiting for location...</div>
        )}
      </div>
    </div>
  );
}

export default LiveRideModal;
