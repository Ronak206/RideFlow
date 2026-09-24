import { useEffect, useState, useRef } from "react";

import { io } from "socket.io-client";

import "./DriverHome.css";

import DriverHeader from "../../component/driver/DriverHeader.jsx";

import DriverProfile from "../../component/driver/DriverProfile.jsx";

import CurrentRide from "../../component/driver/CurrentRide.jsx";

import AvailableRides from "../../component/driver/AvailableRides.jsx";

import MyRides from "../../component/driver/MyRides.jsx";

import LiveRideModal from "../../component/driver/LiveRideModal.jsx";

import RideMap from "../../component/RideMap.jsx";

function DriverHome() {
  const [driver, setDriver] = useState(null);

  const [trips, setTrips] = useState([]);

  const [driverTrips, setDriverTrips] = useState([]);

  const [loading, setLoading] = useState(true);

  const [loadingTrips, setLoadingTrips] = useState(true);

  const [updating, setUpdating] = useState(false);

  const [acceptingTrip, setAcceptingTrip] = useState(null);

  const [startingTrip, setStartingTrip] = useState(false);

  const [completingTrip, setCompletingTrip] = useState(false);

  const [cancellingTrip, setCancellingTrip] = useState(false);

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  // ==========================================
  // CURRENT ACTIVE TRIP
  // ==========================================

  const [currentTripId, setCurrentTripId] = useState(() =>
    localStorage.getItem("currentTripId"),
  );

  // ==========================================
  // LIVE RIDE
  // ==========================================

  const [liveRideOpen, setLiveRideOpen] = useState(false);

  const [liveLocation, setLiveLocation] = useState(null);

  const [liveRoute, setLiveRoute] = useState([]);

  const [liveDistance, setLiveDistance] = useState(null);

  const [liveUpdatedAt, setLiveUpdatedAt] = useState(null);

  const [liveLocationError, setLiveLocationError] = useState("");

  // ==========================================
  // SOCKET
  // ==========================================

  const socketRef = useRef(null);

  // ==========================================
  // GPS
  // ==========================================

  const gpsWatchRef = useRef(null);

  const lastGPSLocationRef = useRef(null);

  // ==========================================
  // SEND CURRENT GPS LOCATION
  // ==========================================

  function sendCurrentLocation() {
    const socket = socketRef.current;

    const location = lastGPSLocationRef.current;

    if (!socket || !socket.connected || !location) {
      return;
    }

    socket.emit("send-location", {
      latitude: location.latitude,

      longitude: location.longitude,
    });
  }

  // ==========================================
  // STOP DRIVER GPS
  // ==========================================

  function stopGPSTracking() {
    if (gpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);

      gpsWatchRef.current = null;
    }
  }

  // ==========================================
  // HANDLE COMPLETE TRIP
  // ==========================================

  async function handleCompleteTrip() {
    try {
      if (!currentTripId) {
        setError("No active trip found.");

        return;
      }

      setCompletingTrip(true);

      setError("");

      setMessage("");

      const response = await fetch("http://localhost:8000/api/trip/complete", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify({
          tripId: currentTripId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to complete trip");
      }

      // Update trip status

      setDriverTrips((previousTrips) =>
        previousTrips.map((trip) =>
          trip._id === currentTripId
            ? {
                ...trip,
                status: "completed",
              }
            : trip,
        ),
      );

      // Stop driver GPS

      stopGPSTracking();

      // Clear current trip

      clearActiveTrip();

      // Close live ride

      setLiveRideOpen(false);

      setLiveLocation(null);

      setLiveRoute([]);

      setLiveDistance(null);

      setLiveUpdatedAt(null);

      setLiveLocationError("");

      setMessage("Trip completed successfully.");
    } catch (error) {
      setError(error.message);
    } finally {
      setCompletingTrip(false);
    }
  }

  // ==========================================
  // SOCKET.IO + DRIVER GPS
  // ==========================================

  useEffect(() => {
    const socket = io("http://localhost:8000", {
      withCredentials: true,
    });

    socketRef.current = socket;

    // ==========================================
    // SOCKET CONNECT
    // ==========================================

    function handleSocketConnect() {
      // Send latest GPS after reconnect

      sendCurrentLocation();
    }

    socket.on("connect", handleSocketConnect);

    // ==========================================
    // RECEIVE NEW NEARBY TRIP REQUEST
    // ==========================================

    function handleNewTripRequest(data) {
      const newTrip = data?.trip;

      if (!newTrip?._id) {
        return;
      }

      setTrips((previousTrips) => {
        const alreadyExists = previousTrips.some(
          (trip) => trip._id === newTrip._id,
        );

        if (alreadyExists) {
          return previousTrips;
        }

        return [newTrip, ...previousTrips];
      });
    }

    // ==========================================
    // RECEIVE LIVE TRIP UPDATE
    // ==========================================

    function handleLiveUpdate(data) {
      if (!data) {
        return;
      }

      // Update live driver location

      if (data.latitude !== undefined && data.longitude !== undefined) {
        const latitude = Number(data.latitude);

        const longitude = Number(data.longitude);

        setLiveLocation({
          latitude,
          longitude,
        });
      }

      // Update backend route

      setLiveRoute(data.route || []);

      // Update remaining distance

      setLiveDistance(data.distanceKm ?? null);

      // Update timestamp

      setLiveUpdatedAt(data.updatedAt || null);
    }

    // ==========================================
    // RECEIVE TRIP COMPLETED
    // ==========================================

    function handleTripCompleted(data) {
      const completedTripId = data?.trip?._id;

      if (!completedTripId || completedTripId !== currentTripId) {
        return;
      }

      setDriverTrips((previousTrips) =>
        previousTrips.map((trip) =>
          trip._id === completedTripId
            ? {
                ...trip,
                status: "completed",
              }
            : trip,
        ),
      );

      // Stop GPS

      stopGPSTracking();

      // Clear current trip

      clearActiveTrip();

      // Close live ride

      setLiveRideOpen(false);

      setLiveLocation(null);

      setLiveRoute([]);

      setLiveDistance(null);

      setLiveUpdatedAt(null);

      setLiveLocationError("");

      setMessage(
        data?.reason === "destination"
          ? "Destination reached. Trip completed."
          : "Trip completed successfully.",
      );
    }

    socket.on("new-trip-request", handleNewTripRequest);

    socket.on("trip-live-update", handleLiveUpdate);

    socket.on("trip-completed", handleTripCompleted);

    // ==========================================
    // DRIVER GPS
    // ==========================================

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");

      return () => {
        socket.off("connect", handleSocketConnect);

        socket.off("new-trip-request", handleNewTripRequest);

        socket.off("trip-live-update", handleLiveUpdate);

        socket.off("trip-completed", handleTripCompleted);

        socket.disconnect();

        socketRef.current = null;
      };
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const latitude = position.coords.latitude;

        const longitude = position.coords.longitude;

        // Save latest GPS position

        lastGPSLocationRef.current = {
          latitude,
          longitude,
        };

        // Update driver's own map immediately

        setLiveLocation({
          latitude,
          longitude,
        });

        // Send GPS to backend

        socket.emit("send-location", {
          latitude,
          longitude,
        });
      },

      () => {
        setError("Unable to get your current location.");
      },

      {
        enableHighAccuracy: true,

        timeout: 5000,

        maximumAge: 0,
      },
    );

    gpsWatchRef.current = watchId;

    return () => {
      stopGPSTracking();

      socket.off("connect", handleSocketConnect);

      socket.off("new-trip-request", handleNewTripRequest);

      socket.off("trip-live-update", handleLiveUpdate);

      socket.off("trip-completed", handleTripCompleted);

      socket.disconnect();

      socketRef.current = null;
    };
  }, []);

  // ==========================================
  // ACTIVE TRIP HELPERS
  // ==========================================

  function setActiveTrip(tripId) {
    if (!tripId) {
      return;
    }

    setCurrentTripId(tripId);

    localStorage.setItem("currentTripId", tripId);
  }

  function clearActiveTrip() {
    setCurrentTripId(null);

    localStorage.removeItem("currentTripId");
  }

  // ==========================================
  // GET DRIVER
  // ==========================================

  async function getDriver() {
    try {
      setLoading(true);

      setError("");

      const response = await fetch("http://localhost:8000/api/driver", {
        method: "GET",

        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to get driver");
      }

      setDriver(data.driver);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // GET AVAILABLE TRIPS
  // ==========================================

  // ==========================================
  // GET AVAILABLE TRIPS
  // ==========================================

  async function getTrips() {
    try {
      setLoadingTrips(true);

      const response = await fetch("http://localhost:8000/api/trip/", {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to get trips");
      }

      // Backend already filters trips
      // by driver status and location.

      setTrips(data.trips || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingTrips(false);
    }
  }

  // ==========================================
  // GET DRIVER TRIPS
  // ==========================================

  async function getDriverTrips(driverId) {
    try {
      if (!driverId) {
        return;
      }

      const response = await fetch(
        `http://localhost:8000/api/trip/${driverId}`,
        {
          method: "GET",

          credentials: "include",
        },
      );

      const data = await response.json();

      if (response.status === 404) {
        setDriverTrips([]);

        clearActiveTrip();

        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to get driver trips");
      }

      const fetchedTrips = data.trips || [];

      setDriverTrips(fetchedTrips);

      // Restore saved current trip

      // only when it is still active

      const savedTripId = localStorage.getItem("currentTripId");

      const savedTrip = fetchedTrips.find(
        (trip) =>
          trip._id === savedTripId &&
          (trip.status === "accepted" || trip.status === "ongoing"),
      );

      if (savedTrip) {
        setCurrentTripId(savedTrip._id);

        return;
      }

      // Saved trip may have been cancelled

      if (savedTripId) {
        const oldTrip = fetchedTrips.find((trip) => trip._id === savedTripId);

        if (
          oldTrip &&
          (oldTrip.status === "cancelled" || oldTrip.status === "completed")
        ) {
          clearActiveTrip();
        }
      }

      // Prefer ongoing trip

      const ongoingTrip = fetchedTrips.find(
        (trip) => trip.status === "ongoing",
      );

      if (ongoingTrip) {
        setActiveTrip(ongoingTrip._id);

        return;
      }

      // Otherwise use accepted trip

      const acceptedTrip = fetchedTrips.find(
        (trip) => trip.status === "accepted",
      );

      if (acceptedTrip) {
        setActiveTrip(acceptedTrip._id);

        return;
      }

      // No active trip

      clearActiveTrip();
    } catch (error) {
      setError(error.message);
    }
  }

  // ==========================================
  // DRIVER ONLINE / OFFLINE
  // ==========================================

  async function handleStatus() {
    try {
      if (!driver) {
        return;
      }

      setUpdating(true);

      setError("");

      const newStatus = driver.status === "online" ? "offline" : "online";

      const response = await fetch("http://localhost:8000/api/driver/status", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update status");
      }

      setDriver((previousDriver) => ({
        ...previousDriver,
        status: data.driver?.status || data.status || newStatus,
      }));

      // Clear available rides immediately
      // when driver goes offline.

      if (newStatus === "offline") {
        setTrips([]);
      }

      // Load available rides again
      // when driver comes online.

      if (newStatus === "online") {
        await getTrips();
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setUpdating(false);
    }
  }

  // ==========================================
  // ACCEPT TRIP
  // ==========================================

  async function handleAcceptTrip(tripId) {
    try {
      if (!driver?.id) {
        setError("Driver information not available.");

        return;
      }

      setAcceptingTrip(tripId);

      setError("");

      setMessage("");

      const response = await fetch("http://localhost:8000/api/trip/", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify({
          tripId,

          driverId: driver.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to accept trip");
      }

      // Remove from available rides

      setTrips((previousTrips) =>
        previousTrips.filter((trip) => trip._id !== tripId),
      );

      // Add to driver rides

      setDriverTrips((previousTrips) => {
        const exists = previousTrips.some((trip) => trip._id === data.trip._id);

        if (exists) {
          return previousTrips.map((trip) =>
            trip._id === data.trip._id ? data.trip : trip,
          );
        }

        return [...previousTrips, data.trip];
      });

      // Set accepted trip as current

      setActiveTrip(data.trip?.["_id"] || tripId);

      setMessage("Ride accepted successfully.");
    } catch (error) {
      setError(error.message);
    } finally {
      setAcceptingTrip(null);
    }
  }

  // ==========================================
  // START TRIP
  // ==========================================

  async function handleStartTrip() {
    try {
      if (!currentTripId) {
        setError("No active trip found.");

        return;
      }

      setStartingTrip(true);

      setError("");

      setMessage("");

      const response = await fetch("http://localhost:8000/api/trip/start", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify({
          tripId: currentTripId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to start trip");
      }

      setDriverTrips((previousTrips) =>
        previousTrips.map((trip) =>
          trip._id === currentTripId
            ? {
                ...trip,
                status: "ongoing",
              }
            : trip,
        ),
      );

      // Important:
      // Send latest GPS immediately after
      // trip becomes ongoing.

      sendCurrentLocation();

      setMessage("Ride started.");
    } catch (error) {
      setError(error.message);
    } finally {
      setStartingTrip(false);
    }
  }

  // ==========================================
  // CANCEL CURRENT TRIP
  // ==========================================

  async function handleCancelTrip() {
    try {
      if (!currentTripId) {
        setError("No active trip found.");

        return;
      }

      setCancellingTrip(true);

      setError("");

      setMessage("");

      const response = await fetch(
        "http://localhost:8000/api/trip/current/cancel",
        {
          method: "PATCH",

          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to cancel trip");
      }

      // Update trip in My Rides

      setDriverTrips((previousTrips) =>
        previousTrips.map((trip) =>
          trip._id === currentTripId
            ? {
                ...trip,
                status: "cancelled",
              }
            : trip,
        ),
      );

      // Stop treating this ride
      // as the current ride

      clearActiveTrip();

      // Close live ride if open

      setLiveRideOpen(false);

      setLiveLocation(null);

      setLiveRoute([]);

      setLiveDistance(null);

      setLiveUpdatedAt(null);

      setLiveLocationError("");

      setMessage("Trip cancelled successfully.");
    } catch (error) {
      setError(error.message);
    } finally {
      setCancellingTrip(false);
    }
  }

  // ==========================================
  // OPEN LIVE RIDE
  // ==========================================

  function openLiveRide(tripId) {
    if (!tripId) {
      setError("Trip not found.");

      return;
    }

    setLiveLocation(null);

    setLiveRoute([]);

    setLiveDistance(null);

    setLiveUpdatedAt(null);

    setLiveLocationError("");

    setLiveRideOpen(true);

    // Request fresh location immediately

    sendCurrentLocation();
  }

  // ==========================================
  // CLOSE LIVE RIDE
  // ==========================================

  function closeLiveRide() {
    setLiveRideOpen(false);

    setLiveLocation(null);

    setLiveRoute([]);

    setLiveDistance(null);

    setLiveUpdatedAt(null);

    setLiveLocationError("");
  }

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    getDriver();

    getTrips();
  }, []);

  // ==========================================
  // LOAD DRIVER TRIPS
  // ==========================================

  useEffect(() => {
    if (driver?.id) {
      getDriverTrips(driver.id);
    }
  }, [driver?.id]);

  // ==========================================
  // CURRENT TRIP
  // ==========================================

  const currentTrip = driverTrips.find(
    (trip) =>
      trip._id === currentTripId &&
      (trip.status === "accepted" || trip.status === "ongoing"),
  );

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="driver-home">
        <main className="driver-content">
          <p>Loading driver information...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="driver-home">
      <DriverHeader
        driver={driver}
        updating={updating}
        onStatus={handleStatus}
        onLogout={() => {
          window.location.href = "/logout";
        }}
      />

      <main className="driver-content">
        {error && <p className="error-message">{error}</p>}

        {message && <p className="success-message">{message}</p>}

        <DriverProfile driver={driver} />

        {currentTrip && (
          <CurrentRide
            currentTrip={currentTrip}
            startingTrip={startingTrip}
            cancellingTrip={cancellingTrip}
            completingTrip={completingTrip}
            handleStartTrip={handleStartTrip}
            handleCancelTrip={handleCancelTrip}
            handleCompleteTrip={handleCompleteTrip}
            openLiveRide={openLiveRide}
          />
        )}

        {!currentTrip && (
          <section className="active-trip">
            <h2>Current Ride</h2>

            <p>You don't have a current ride.</p>
          </section>
        )}

        <AvailableRides
          trips={trips}
          loadingTrips={loadingTrips}
          acceptingTrip={acceptingTrip}
          handleAcceptTrip={handleAcceptTrip}
        />

        <MyRides
          driverTrips={driverTrips}
          currentTripId={currentTripId}
          startingTrip={startingTrip}
          cancellingTrip={cancellingTrip}
          completingTrip={completingTrip}
          handleStartTrip={handleStartTrip}
          handleCancelTrip={handleCancelTrip}
          handleCompleteTrip={handleCompleteTrip}
          openLiveRide={openLiveRide}
        />
      </main>

      {liveRideOpen && currentTrip && (
        <LiveRideModal
          currentTrip={currentTrip}
          liveLocation={liveLocation}
          liveRoute={liveRoute}
          liveDistance={liveDistance}
          liveUpdatedAt={liveUpdatedAt}
          liveLocationError={liveLocationError}
          closeLiveRide={closeLiveRide}
        />
      )}
    </div>
  );
}

export default DriverHome;
