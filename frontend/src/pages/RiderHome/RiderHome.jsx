import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import "./RiderHome.css";

import RideMap from "../../component/RideMap.jsx";

import useLiveTrip from "../../hooks/useLiveTrip.js";

import { io } from "socket.io-client";

import { API_URL, SOCKET_URL } from "../../config/api.js";

function RiderHome() {
  const navigate = useNavigate();

  const [source, setSource] = useState(null);

  const [destination, setDestination] = useState(null);

  const [destinationLatitude, setDestinationLatitude] = useState("");

  const [destinationLongitude, setDestinationLongitude] = useState("");

  const [loadingLocation, setLoadingLocation] = useState(false);

  const [loadingTrip, setLoadingTrip] = useState(false);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  // Current trip

  const [currentTrip, setCurrentTrip] = useState(null);

  const [loadingCurrentTrip, setLoadingCurrentTrip] = useState(false);

  // Trip history

  const [tripHistory, setTripHistory] = useState([]);

  const [loadingHistory, setLoadingHistory] = useState(false);

  // Delete trip

  const [deletingTripId, setDeletingTripId] = useState(null);

  // Cancel trip

  const [cancellingTrip, setCancellingTrip] = useState(false);

  // Live trip

  const {
    liveLocation,
    liveRoute,
    liveDistance,
    liveUpdatedAt,
    liveLoading,
    liveError,
  } = useLiveTrip(currentTrip?.status === "ongoing");

  function handleLogout() {
    navigate("/logout");
  }

  // ==========================================
  // GET TRIP HISTORY
  // ==========================================

  async function getTripHistory() {
    try {
      setLoadingHistory(true);

      const response = await fetch(`${API_URL}/api/trip/history`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      console.log("Trip history response:", data);

      if (!response.ok) {
        if (response.status === 404) {
          setTripHistory([]);

          return;
        }

        setError(data.message || "Unable to get trip history.");

        return;
      }

      setTripHistory(data.trip || []);
    } catch (error) {
      console.error("Trip history error:", error);

      setError("Something went wrong while getting trip history.");
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    getCurrentTrip();
    getTripHistory();
  }, []);

  // ==========================================
  // GET CURRENT TRIP
  // ==========================================

  async function getCurrentTrip(showLoading = false) {
    try {
      if (showLoading) {
        setLoadingCurrentTrip(true);
      }

      const response = await fetch(`${API_URL}/api/trip/current`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to get current trip.");

        return;
      }

      // requested, accepted and ongoing
      // are all current trips

      setCurrentTrip(data.trip || null);
    } catch (error) {
      console.error("Current trip error:", error);

      setError("Something went wrong while getting current trip.");
    } finally {
      if (showLoading) {
        setLoadingCurrentTrip(false);
      }
    }
  }

  // ==========================================
  // SOCKET.IO - TRIP COMPLETED
  // ==========================================

  useEffect(() => {
    const socket = io(`${SOCKET_URL}`, {
      withCredentials: true,
    });

    function handleTripCompleted(data) {
      console.log("Trip completed event received:", data);

      // Remove completed trip from current trip
      setCurrentTrip(null);

      // Get latest current trip
      getCurrentTrip();

      // Get latest trip history
      getTripHistory();
    }

    socket.on("trip-completed", handleTripCompleted);

    return () => {
      socket.off("trip-completed", handleTripCompleted);

      socket.disconnect();
    };
  }, []);

  // ==========================================
  // DELETE TRIP
  // ==========================================

  async function handleDeleteTrip(tripId, event) {
    event.preventDefault();

    if (!tripId) {
      setError("Trip could not be deleted.");

      return;
    }

    setError("");

    setMessage("");

    setDeletingTripId(tripId);

    try {
      const response = await fetch(`${API_URL}/api/trip/${tripId}`, {
        method: "DELETE",

        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify({
          tripId: tripId,
        }),
      });

      const data = await response.json();

      console.log("Delete trip response:", data);

      if (!response.ok) {
        setError(data.message || "Unable to delete trip.");

        return;
      }

      // Remove deleted trip from history

      setTripHistory((previousTrips) =>
        previousTrips.filter((trip) => trip._id !== tripId),
      );

      // Clear current trip if it was deleted

      if (currentTrip?._id === tripId) {
        setCurrentTrip(null);
      }

      setMessage("Trip deleted successfully.");
    } catch (error) {
      console.error("Delete trip error:", error);

      setError("Something went wrong while deleting the trip.");
    } finally {
      setDeletingTripId(null);
    }
  }

  // ==========================================
  // CANCEL CURRENT TRIP
  // ==========================================

  async function handleCancelTrip(event) {
    event.preventDefault();

    if (!currentTrip) {
      setError("No current trip found.");

      return;
    }

    setError("");

    setMessage("");

    setCancellingTrip(true);

    try {
      const response = await fetch(
        `${API_URL}/api/trip/current/cancel`,
        {
          method: "PATCH",
          credentials: "include",
        },
      );

      const data = await response.json();

      console.log("Cancel trip response:", data);

      if (!response.ok) {
        setError(data.message || "Unable to cancel trip.");

        return;
      }

      // Remove current trip from frontend

      setCurrentTrip(null);

      // Clear selected destination

      setDestination(null);

      setDestinationLatitude("");

      setDestinationLongitude("");

      setMessage("Trip cancelled successfully.");

      // Refresh history because cancelled
      // trips can appear there

      getTripHistory();
    } catch (error) {
      console.error("Cancel trip error:", error);

      setError("Something went wrong while cancelling the trip.");
    } finally {
      setCancellingTrip(false);
    }
  }

  // ==========================================
  // LOAD CURRENT TRIP + HISTORY
  // ==========================================

  useEffect(() => {
    // Initial request shows loading

    getCurrentTrip(true);

    getTripHistory();

    // Poll current trip every 2 seconds

    const interval = setInterval(() => {
      getCurrentTrip(false);
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // ==========================================
  // GET CURRENT LOCATION
  // ==========================================

  function getCurrentLocation() {
    setError("");

    setMessage("");

    setLoadingLocation(true);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");

      setLoadingLocation(false);

      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;

        const longitude = position.coords.longitude;

        setSource({
          type: "Point",

          coordinates: [longitude, latitude],
        });

        setMessage("Pickup location detected successfully.");

        setLoadingLocation(false);

        console.log("Current latitude:", latitude);

        console.log("Current longitude:", longitude);
      },

      (error) => {
        console.error("Location error:", error);

        setError("Unable to get your location. Please allow location access.");

        setLoadingLocation(false);
      },
    );
  }

  // ==========================================
  // CREATE TRIP
  // ==========================================

  async function handleFindRide(event) {
    event.preventDefault();

    // Do not allow another current trip

    if (currentTrip) {
      setError("You already have a current trip.");

      return;
    }

    setError("");

    setMessage("");

    if (!source) {
      setError("Please select your pickup location.");

      return;
    }

    if (destinationLatitude === "" || destinationLongitude === "") {
      setError("Please enter destination coordinates.");

      return;
    }

    const latitude = Number(destinationLatitude);

    const longitude = Number(destinationLongitude);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setError("Invalid destination coordinates.");

      return;
    }

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError("Invalid destination coordinates.");

      return;
    }

    const tripData = {
      source: source,

      destination: {
        type: "Point",

        coordinates: [longitude, latitude],
      },
    };

    setDestination({
      type: "Point",

      coordinates: [longitude, latitude],
    });

    console.log("Trip request:", tripData);

    try {
      setLoadingTrip(true);

      const response = await fetch(`${API_URL}/api/trip`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify(tripData),
      });

      const data = await response.json();

      console.log("Trip response:", data);

      if (!response.ok) {
        setError(data.message || "Unable to create trip.");

        return;
      }

      // Show backend calculated fare

      if (data.trip && data.trip.price !== undefined) {
        const distanceText =
          data.trip.distanceKm !== undefined
            ? ` Distance: ${data.trip.distanceKm} km.`
            : "";

        setMessage(
          `Trip requested successfully! Fare: ₹${data.trip.price}.${distanceText}`,
        );
      } else {
        setMessage("Trip requested successfully! 🚗");
      }

      console.log("Created trip:", data.trip);

      // Immediately load requested trip

      await getCurrentTrip(false);
    } catch (error) {
      console.error("Create trip error:", error);

      setError("Something went wrong while requesting the ride.");
    } finally {
      setLoadingTrip(false);
    }
  }

  return (
    <div className="rider-home">
      <header className="rider-header">
        <div className="rider-logo">RiderFlow 🚗</div>

        <button type="button" className="rider-logout" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <main className="rider-content">
        <section className="rider-welcome">
          <p className="rider-label">RIDER</p>

          <h1>Where are you going today?</h1>

          <p>Find a ride and get where you need to go.</p>
        </section>

        {/* =========================================
                    CURRENT TRIP
                ========================================= */}

        <section className="current-trip-section">
          <h2>Current Trip</h2>

          {loadingCurrentTrip ? (
            <p>Loading current trip...</p>
          ) : currentTrip ? (
            <div className="current-trip-card">
              <div>
                <strong>Status</strong>

                <p>{currentTrip.status}</p>
              </div>

              <div>
                <strong>Distance</strong>

                <p>{currentTrip.distanceKm ?? "N/A"} km</p>
              </div>

              <div>
                <strong>Price</strong>

                <p>₹{currentTrip.price}</p>
              </div>

              {/* REQUESTED */}

              {currentTrip.status === "requested" && (
                <div className="current-trip-status">
                  <span>🟢</span>

                  <p>Searching for a driver...</p>
                </div>
              )}

              {/* ACCEPTED */}

              {currentTrip.status === "accepted" && (
                <div className="current-trip-status">
                  <span>🟢</span>

                  <p>Driver accepted your ride.</p>
                </div>
              )}

              {/* ONGOING */}

              {currentTrip.status === "ongoing" && (
                <div className="current-trip-status">
                  <span>🟢</span>

                  <p>Your ride is currently ongoing.</p>
                </div>
              )}

              {/* CANCEL BUTTON */}

              {(currentTrip.status === "requested" ||
                currentTrip.status === "accepted" ||
                currentTrip.status === "ongoing") && (
                <button
                  type="button"
                  className="cancel-trip-button"
                  onClick={handleCancelTrip}
                  disabled={cancellingTrip}
                >
                  {cancellingTrip ? "Cancelling..." : "Cancel Trip"}
                </button>
              )}
            </div>
          ) : (
            <p>You don't have a current trip right now.</p>
          )}
        </section>

        {/* =========================================
                    FIND RIDE
                ========================================= */}

        <section className="ride-search-card">
          <h2>Find a ride</h2>

          {/* Pickup */}

          <div className="ride-input">
            <span>📍</span>

            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={!!currentTrip}
            >
              {loadingLocation
                ? "Getting location..."
                : source
                  ? "Pickup location detected"
                  : "Use my current location"}
            </button>
          </div>

          {/* Destination Latitude */}

          <div className="ride-input">
            <span>🏁</span>

            <input
              type="number"
              step="any"
              placeholder="Destination latitude"
              value={destinationLatitude}
              onChange={(event) => setDestinationLatitude(event.target.value)}
              disabled={!!currentTrip}
            />
          </div>

          {/* Destination Longitude */}

          <div className="ride-input">
            <span>📍</span>

            <input
              type="number"
              step="any"
              placeholder="Destination longitude"
              value={destinationLongitude}
              onChange={(event) => setDestinationLongitude(event.target.value)}
              disabled={!!currentTrip}
            />
          </div>

          {message && <p className="success-message">{message}</p>}

          {error && <p className="error-message">{error}</p>}

          <button
            type="button"
            className="find-ride-button"
            onClick={handleFindRide}
            disabled={loadingTrip || !!currentTrip}
          >
            {loadingTrip
              ? "Requesting..."
              : currentTrip
                ? "Current Trip Active"
                : "Find a Ride"}
          </button>
        </section>

        {/* =========================================
                    MAP
                ========================================= */}

        <section className="ride-map-section">
          <h2>Your Ride Map</h2>

          <RideMap
            source={currentTrip ? currentTrip.source : source}
            destination={currentTrip ? currentTrip.destination : destination}
            driverLocation={liveLocation}
            route={liveRoute}
          />
        </section>

        {/* =========================================
                    OPTIONS
                ========================================= */}

        <section className="rider-options">
          <div className="rider-option-card">
            <span className="option-icon">🚕</span>

            <div>
              <h3>Book a Ride</h3>

              <p>Find a driver near you.</p>
            </div>
          </div>

          <div className="rider-option-card">
            <span className="option-icon">🕘</span>

            <div>
              <h3>Ride History</h3>

              <p>View your previous rides.</p>
            </div>
          </div>
        </section>

        {/* =========================================
                    TRIP HISTORY
                ========================================= */}

        <section className="trip-history-section">
          <h2>Trip History</h2>

          {loadingHistory ? (
            <p>Loading trip history...</p>
          ) : tripHistory.length === 0 ? (
            <p>No trip history yet.</p>
          ) : (
            <div className="trip-history-list">
              {tripHistory.map((trip) => (
                <div className="trip-history-card" key={trip._id}>
                  <div>
                    <strong>Status</strong>

                    <p>{trip.status}</p>
                  </div>

                  <div>
                    <strong>Distance</strong>

                    <p>{trip.distanceKm ?? "N/A"} km</p>
                  </div>

                  <div>
                    <strong>Price</strong>

                    <p>₹{trip.price}</p>
                  </div>

                  <div>
                    <strong>Pickup</strong>

                    <p>
                      {trip.source?.coordinates
                        ? `${trip.source.coordinates[1]}, ${trip.source.coordinates[0]}`
                        : "N/A"}
                    </p>
                  </div>

                  <div>
                    <strong>Destination</strong>

                    <p>
                      {trip.destination?.coordinates
                        ? `${trip.destination.coordinates[1]}, ${trip.destination.coordinates[0]}`
                        : "N/A"}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="delete-trip-button"
                    onClick={(event) => handleDeleteTrip(trip._id, event)}
                    disabled={deletingTripId === trip._id}
                  >
                    {deletingTripId === trip._id
                      ? "Deleting..."
                      : "Delete Trip"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default RiderHome;
