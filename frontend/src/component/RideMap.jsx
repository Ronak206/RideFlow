import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";

import { useEffect, useRef } from "react";

import L from "leaflet";

import "leaflet/dist/leaflet.css";
import "./RideMap.css";

// Fix map size after rendering

function MapSizeFix() {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [map]);

  return null;
}

// Control map view

function MapController({ source, destination, driverLocation }) {
  const map = useMap();

  useEffect(() => {
    if (driverLocation) {
      const position = [
        Number(driverLocation.latitude),
        Number(driverLocation.longitude),
      ];

      map.setView(position, 16);

      return;
    }

    const positions = [];

    if (source) {
      positions.push([source.coordinates[1], source.coordinates[0]]);
    }

    if (destination) {
      positions.push([destination.coordinates[1], destination.coordinates[0]]);
    }

    if (positions.length === 1) {
      map.setView(positions[0], 13);
    }

    if (positions.length === 2) {
      map.fitBounds(positions, {
        padding: [50, 50],
      });
    }
  }, [source, destination, driverLocation, map]);

  return null;
}

// Driver marker

function DriverMarker({ driverLocation }) {
  const map = useMap();

  const markerRef = useRef(null);

  useEffect(() => {
    if (!driverLocation) {
      return;
    }

    const position = [
      Number(driverLocation.latitude),
      Number(driverLocation.longitude),
    ];

    if (markerRef.current) {
      markerRef.current.setLatLng(position);
    } else {
      markerRef.current = L.marker(position).addTo(map);

      markerRef.current.bindPopup(
        "<strong>🚗 Driver Location</strong><br />Live driver location",
      );
    }
  }, [driverLocation, map]);

  useEffect(() => {
    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);

        markerRef.current = null;
      }
    };
  }, [map]);

  return null;
}

function RideMap({ source, destination, driverLocation, route = [] }) {
  if (!source && !destination) {
    return (
      <div className="ride-map-empty">
        <span>🗺️</span>
        <p>Select your pickup and destination</p>
      </div>
    );
  }

  const center = driverLocation
    ? [Number(driverLocation.latitude), Number(driverLocation.longitude)]
    : source
      ? [source.coordinates[1], source.coordinates[0]]
      : destination
        ? [destination.coordinates[1], destination.coordinates[0]]
        : [0, 0];

  return (
    <div className="ride-map-container">
      <MapContainer
        center={center}
        zoom={driverLocation ? 16 : 13}
        className="ride-map"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapSizeFix />

        <MapController
          source={source}
          destination={destination}
          driverLocation={driverLocation}
        />

        {source && !driverLocation && (
          <Marker position={[source.coordinates[1], source.coordinates[0]]}>
            <Popup>
              <strong>📍 Pickup Location</strong>
              <br />
              Your pickup point
            </Popup>
          </Marker>
        )}

        {destination && (
          <Marker
            position={[destination.coordinates[1], destination.coordinates[0]]}
          >
            <Popup>
              <strong>🏁 Destination</strong>
              <br />
              Your drop-off point
            </Popup>
          </Marker>
        )}

        {route.length > 0 && (
          <Polyline
            positions={route}
            pathOptions={{
              weight: 5,
            }}
          />
        )}

        <DriverMarker driverLocation={driverLocation} />
      </MapContainer>
    </div>
  );
}

export default RideMap;
