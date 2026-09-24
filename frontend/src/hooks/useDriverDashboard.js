import { useEffect, useState } from "react";
import { API_URL, SOCKET_URL } from "../config/api.js";

function useDriverDashboard() {
  const [driver, setDriver] = useState(null);
  const [trips, setTrips] = useState([]);
  const [driverTrips, setDriverTrips] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingTrips, setLoadingTrips] = useState(true);

  const [updating, setUpdating] = useState(false);

  const [acceptingTrip, setAcceptingTrip] = useState(null);

  const [startingTrip, setStartingTrip] = useState(false);

  const [error, setError] = useState("");

  // Current active trip

  const [currentTripId, setCurrentTripId] = useState(() =>
    localStorage.getItem("currentTripId"),
  );

  // Active trip helpers

  function setActiveTrip(tripId) {
    if (!tripId) {
      return;
    }

    setCurrentTripId(tripId);

    localStorage.setItem("currentTripId", tripId);
  }

  // Get driver

  async function getDriver() {
    try {
      setLoading(true);

      setError("");

      const response = await fetch(`${API_URL}/api/driver`, {
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

  // Get available trips

  async function getTrips() {
    try {
      setLoadingTrips(true);

      const response = await fetch(`${API_URL}/api/trip/`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to get trips");
      }

      const availableTrips = (data.trips || []).filter(
        (trip) => trip.status === "requested" && !trip.driver,
      );

      setTrips(availableTrips);
    } catch (error) {
      if (!error.message.includes("No trips")) {
        setError(error.message);
      }
    } finally {
      setLoadingTrips(false);
    }
  }

  // Get driver trips

  async function getDriverTrips(driverId) {
    try {
      if (!driverId) {
        return;
      }

      const response = await fetch(`${API_URL}/api/trip/${driverId}`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (response.status === 404) {
        setDriverTrips([]);

        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to get driver trips");
      }

      const fetchedTrips = data.trips || [];

      setDriverTrips(fetchedTrips);

      // Restore previously selected trip

      const savedTripId = localStorage.getItem("currentTripId");

      const savedTrip = fetchedTrips.find((trip) => trip._id === savedTripId);

      if (savedTrip) {
        setCurrentTripId(savedTrip._id);

        return;
      }

      // Prefer ongoing trip

      const ongoingTrip = fetchedTrips.find(
        (trip) => trip.status === "ongoing",
      );

      if (ongoingTrip) {
        setActiveTrip(ongoingTrip._id);

        return;
      }

      // Otherwise select accepted trip

      const acceptedTrip = fetchedTrips.find(
        (trip) => trip.status === "accepted",
      );

      if (acceptedTrip) {
        setActiveTrip(acceptedTrip._id);
      }
    } catch (error) {
      setError(error.message);
    }
  }

  // Update driver online / offline status

  async function handleStatus() {
    try {
      if (!driver) {
        return;
      }

      setUpdating(true);

      setError("");

      const newStatus = driver.status === "online" ? "offline" : "online";

      const response = await fetch(`${API_URL}/api/driver/status`, {
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
    } catch (error) {
      setError(error.message);
    } finally {
      setUpdating(false);
    }
  }

  // Accept trip

  async function handleAcceptTrip(tripId) {
    try {
      if (!driver?.id) {
        setError("Driver information not available");

        return;
      }

      setAcceptingTrip(tripId);

      setError("");

      const response = await fetch(`${API_URL}/api/trip/`, {
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

      // Add to my rides

      setDriverTrips((previousTrips) => {
        const alreadyExists = previousTrips.some(
          (trip) => trip._id === data.trip._id,
        );

        if (alreadyExists) {
          return previousTrips.map((trip) =>
            trip._id === data.trip._id ? data.trip : trip,
          );
        }

        return [...previousTrips, data.trip];
      });

      // Make accepted trip current

      setActiveTrip(data.trip?._id || tripId);
    } catch (error) {
      setError(error.message);
    } finally {
      setAcceptingTrip(null);
    }
  }

  // Start trip

  async function handleStartTrip() {
    try {
      if (!currentTripId) {
        setError("No active trip found");

        return;
      }

      setStartingTrip(true);

      setError("");

      const response = await fetch(`${API_URL}/api/trip/start`, {
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

      // Update frontend status

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
    } catch (error) {
      setError(error.message);
    } finally {
      setStartingTrip(false);
    }
  }

  // Initial load

  useEffect(() => {
    getDriver();

    getTrips();
  }, []);

  // Load driver trips

  useEffect(() => {
    if (driver?.id) {
      getDriverTrips(driver.id);
    }
  }, [driver?.id]);

  // Current trip

  const currentTrip = driverTrips.find((trip) => trip._id === currentTripId);

  return {
    driver,
    trips,
    driverTrips,

    loading,
    loadingTrips,

    updating,
    acceptingTrip,
    startingTrip,

    error,

    currentTripId,
    currentTrip,

    setError,

    handleStatus,
    handleAcceptTrip,
    handleStartTrip,
  };
}

export default useDriverDashboard;
