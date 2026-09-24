import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

import { API_URL, SOCKET_URL } from "../../config/api.js";

function useDriverLocation({
  setLiveLocation,
  setLiveRoute,
  setLiveDistance,
  setLiveUpdatedAt,
  setLiveLocationError,
  setError,
}) {
  const socketRef = useRef(null);

  // SOCKET.IO + LIVE GPS

  useEffect(() => {
    const socket = io(`${SOCKET_URL}`, {
      withCredentials: true,
    });

    socketRef.current = socket;

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser");

      return () => {
        socket.disconnect();

        socketRef.current = null;
      };
    }

    // Receive route and location
    // from backend

    socket.on("trip-live-update", (data) => {
      if (!data) {
        return;
      }

      if (data.latitude !== undefined && data.longitude !== undefined) {
        setLiveLocation({
          latitude: data.latitude,

          longitude: data.longitude,
        });
      }

      setLiveRoute(data.route || []);

      setLiveDistance(data.distanceKm ?? null);

      setLiveUpdatedAt(data.updatedAt || null);
    });

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const latitude = position.coords.latitude.toFixed(8);

        const longitude = position.coords.longitude.toFixed(8);

        socket.emit("send-location", {
          latitude,
          longitude,
        });

        // Keep current GPS location
        // available immediately

        setLiveLocation({
          latitude,
          longitude,
        });
      },

      () => {
        setLiveLocationError("Unable to get your current location");

        setError("Unable to get your current location");
      },

      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);

      socket.disconnect();

      socketRef.current = null;
    };
  }, [
    setLiveLocation,
    setLiveRoute,
    setLiveDistance,
    setLiveUpdatedAt,
    setLiveLocationError,
    setError,
  ]);

  return socketRef;
}

export default useDriverLocation;
