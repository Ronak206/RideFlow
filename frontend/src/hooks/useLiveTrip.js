import { useEffect, useState } from "react";

import { io } from "socket.io-client";

function useLiveTrip(enabled) {
  const [liveLocation, setLiveLocation] = useState(null);

  const [liveRoute, setLiveRoute] = useState([]);

  const [liveDistance, setLiveDistance] = useState(null);

  const [liveUpdatedAt, setLiveUpdatedAt] = useState(null);

  const [liveLoading, setLiveLoading] = useState(false);

  const [liveError, setLiveError] = useState("");

  useEffect(() => {
    if (!enabled) {
      setLiveLocation(null);
      setLiveRoute([]);
      setLiveDistance(null);
      setLiveUpdatedAt(null);
      setLiveError("");

      return;
    }

    let socket = null;

    async function loadLiveTrip() {
      try {
        setLiveLoading(true);
        setLiveError("");

        const response = await fetch(
          "http://localhost:8000/api/trip/current/live",
          {
            method: "GET",
            credentials: "include",
          },
        );

        const data = await response.json();

        if (response.ok && data.liveTrip) {
          setLiveLocation(data.liveTrip.location || null);

          setLiveRoute(data.liveTrip.route || []);

          setLiveDistance(data.liveTrip.distanceKm ?? null);

          setLiveUpdatedAt(data.liveTrip.updatedAt || null);
        }

        socket = io("http://localhost:8000", {
          withCredentials: true,
        });

        socket.on("connect", () => {
          socket.emit("join-live-trip");
        });

        socket.on("trip-live-update", (data) => {
          if (!data) {
            return;
          }

          setLiveLocation({
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
          });

          setLiveRoute(data.route || []);

          setLiveDistance(data.distanceKm ?? null);

          setLiveUpdatedAt(data.updatedAt || null);
        });

        socket.on("connect_error", () => {
          setLiveError("Unable to connect to live ride");
        });
      } catch (error) {
        setLiveError(error.message || "Unable to get live trip");
      } finally {
        setLiveLoading(false);
      }
    }

    loadLiveTrip();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [enabled]);

  return {
    liveLocation,
    liveRoute,
    liveDistance,
    liveUpdatedAt,
    liveLoading,
    liveError,
  };
}

export default useLiveTrip;
