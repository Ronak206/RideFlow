# RiderFlow 🚗

RiderFlow is a full-stack ride-sharing web application built with **React, Node.js, Express, MongoDB, Redis/Valkey, Socket.IO, React Leaflet, and OSRM**.

It supports the complete ride flow from **rider booking → nearby driver matching → driver acceptance → trip start → live GPS tracking → route updates → trip completion → trip history**.

## 🌐 Live Demo

### Frontend
**https://ride-flow-liard.vercel.app**

### Backend API
**https://riderflow-backend.onrender.com**

> The frontend is deployed on Vercel and the backend is deployed on Render.

> Production authentication uses an HTTP-only JWT cookie. Because the frontend and backend are on different origins, the production cookie configuration needs `SameSite=None` and `Secure`.

---

## ✨ Main Features

### 👤 Rider

- Rider signup and login
- Rider authentication with JWT cookie
- Pickup/source location selection
- Destination selection
- Interactive map using React Leaflet
- Road distance calculation using OSRM
- Automatic fare calculation
- Ride request creation
- Nearby driver matching within **5 km**
- Current trip tracking
- Live driver location during an ongoing ride
- Live road route from driver to destination
- Live remaining road distance
- Trip status updates
- Trip cancellation
- Trip history
- Delete trip history entries
- Real-time trip-completed notification without page refresh

### 🚗 Driver

- Driver signup and login
- Vehicle information
- Online / offline availability
- Browser GPS location sharing
- Live driver location updates through Socket.IO
- Nearby ride requests
- Available rides filtered by driver status and location
- Ride acceptance
- Accepted trip list
- Start ride
- Live trip tracking
- Manual ride completion
- Automatic ride completion after reaching destination
- Driver trip history

---

## ⚡ Real-Time Ride Tracking

RiderFlow separates **durable trip data** from **temporary live trip state**.

```text
Driver Browser GPS
        │
        ▼
   Socket.IO
        │
        ▼
Authenticated Backend
        │
        ├── Updates Driver lastLocation in MongoDB
        │
        ├── Finds driver's ongoing trip
        │
        ├── Requests current road route from OSRM
        │
        ▼
 Redis / Valkey
        │
        ├── Driver latitude / longitude
        ├── Current route
        ├── Remaining road distance
        └── Updated timestamp
        │
        ▼
   Socket.IO Trip Room
        │
        ▼
      Rider
        │
        ▼
 React Leaflet Map
```

The backend is responsible for the **live route calculation and shared live state**, while the frontend focuses on displaying it.

---

## 🗺️ Mapping & Routing

RiderFlow uses free/open mapping and routing services:

- **Leaflet** for the interactive map
- **React Leaflet** for React integration
- **OpenStreetMap** map tiles
- **OSRM (Open Source Routing Machine)** for driving routes and road distance

The backend requests routes from OSRM and converts the returned GeoJSON coordinates into the format required by Leaflet.

### Live Route Behavior

During an ongoing trip:

1. Driver sends GPS coordinates.
2. Backend validates the coordinates.
3. Backend stores the latest driver location.
4. Backend finds the driver's ongoing trip.
5. OSRM calculates the current driving route to the destination.
6. Redis / Valkey stores the temporary live trip state.
7. Socket.IO broadcasts the update to the trip room.
8. Rider's map updates the driver marker and route.

---

## 📍 Nearby Driver Matching

When a rider requests a trip, RiderFlow looks for drivers who are:

- `online`
- Have a valid GeoJSON `Point` location
- Are within **5 km** of the trip pickup location

MongoDB uses a **`2dsphere` index** and `$near` geospatial queries for this.

```text
Rider Pickup
     │
     │  5 km radius
     ▼
 ┌─────────────────┐
 │ Online Drivers  │
 │ with GPS data   │
 └─────────────────┘
```

The backend also filters available trips for a driver based on the driver's current location.

---

## 🔐 Authentication

RiderFlow uses:

- JWT authentication
- HTTP-only `uid` cookie
- Express authentication middleware for REST APIs
- Socket.IO authentication middleware for real-time connections
- Rider and driver roles

REST requests use the authenticated cookie, while Socket.IO authenticates the same cookie during the handshake.

Socket users are assigned to private rooms such as:

```text
driver:<driverId>
rider:<userId>
trip:<tripId>
```

These rooms are used for targeted ride requests and live trip/completion updates.

---

## 🔄 Trip Lifecycle

```text
requested
    │
    ▼
accepted
    │
    ▼
ongoing
    │
    ├──────────────► cancelled
    │
    ▼
completed
```

### Request

The rider creates a trip using source and destination coordinates.

### Driver Matching

Nearby online drivers receive a real-time `new-trip-request` event.

### Acceptance

A driver accepts the requested trip. The backend performs the acceptance against the requested trip and assigned driver, preventing multiple drivers from successfully claiming the same trip.

### Ongoing

After the driver starts the ride, GPS updates begin powering the live trip state.

### Completion

A trip can be completed in two ways:

1. The driver presses **Complete Ride**.
2. The backend automatically completes the trip when OSRM reports the remaining road distance is at or below **50 meters**.

When a trip is completed:

- MongoDB status becomes `completed`
- Redis live-trip state is deleted
- Driver and rider receive a `trip-completed` Socket.IO event
- Rider can update current trip/history without a manual refresh

---

## 💰 Fare Calculation

Current fare model:

```text
Base fare = ₹25
Rate      = ₹6 / km

Fare = ₹25 + (road distance in km × ₹6)
```

The distance comes from **OSRM road distance**, not straight-line distance.

Example:

```text
Road distance = 5 km

Fare = 25 + (5 × 6)
     = ₹55
```

---

## 🧠 Redis / Valkey Usage

Redis / Valkey is used for **temporary live trip state**, not as the primary database.

Example key:

```text
trip:live:<tripId>
```

Stored live information includes:

- Driver latitude
- Driver longitude
- Current backend-generated route
- Remaining road distance
- Last update time

MongoDB remains responsible for durable users, drivers, and trips.

```text
MongoDB
→ permanent application data

Redis / Valkey
→ temporary high-frequency live state
```

---

## 🗃️ Data Models

### User

Stores account information such as:

- Name
- Email
- Password hash
- Role (`rider` / `driver`)

### Driver

Stores:

- User reference
- Online/offline status
- Rating
- Vehicle name
- Vehicle number
- Latest GeoJSON GPS location

### Trip

Stores:

- Rider reference
- Driver reference
- Source location
- Destination location
- Road distance
- Fare
- Trip status
- Created / updated timestamps

### GeoJSON Location Format

Locations are stored as:

```json
{
  "type": "Point",
  "coordinates": [longitude, latitude]
}
```

MongoDB `2dsphere` indexes are used for geospatial queries.

---

## 🔌 REST API Highlights

Base URL:

```text
https://riderflow-backend.onrender.com/api
```

### Authentication

```text
POST /auth/login
POST /auth/logout
GET  /auth/me
```

### Driver

```text
GET   /driver/
GET   /driver/nearby
PUT   /driver/
DELETE /driver/
PATCH /driver/status
```

### Trip

```text
GET   /trip/
GET   /trip/current
GET   /trip/history
GET   /trip/:id
PATCH /trip/accept
PATCH /trip/start
PATCH /trip/complete
PATCH /trip/cancel
```

> Exact request bodies and route availability can change as the application evolves. Check the current backend route/controller files when integrating against the API.

---

## 🔌 Socket.IO Events

### Client → Server

```text
join-live-trip
send-location
```

### Server → Client

```text
new-trip-request
trip-live-update
trip-completed
```

### Socket Rooms

```text
driver:<driverId>
rider:<userId>
trip:<tripId>
```

---

## 🏗️ Architecture

```text
                    ┌────────────────────────┐
                    │       RiderFlow        │
                    │        Frontend        │
                    │ React + Vite           │
                    │ React Router           │
                    │ React Leaflet          │
                    │ Socket.IO Client       │
                    └────────────┬───────────┘
                                 │
                         HTTPS / WebSocket
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   Node.js + Express    │
                    │       Backend          │
                    │ REST + Socket.IO       │
                    └───────┬────────┬───────┘
                            │        │
             ┌──────────────┘        └──────────────┐
             ▼                                      ▼
   ┌─────────────────────┐              ┌─────────────────────┐
   │     MongoDB Atlas   │              │   Redis / Valkey    │
   │                     │              │                     │
   │ Users               │              │ Live trip state     │
   │ Drivers             │              │ Temporary location  │
   │ Trips               │              │ Current route       │
   └─────────────────────┘              └─────────────────────┘
             ▲
             │
             ▼
   ┌─────────────────────┐
   │         OSRM        │
   │ Driving route       │
   │ Road distance       │
   └─────────────────────┘
```

---

## 🧰 Tech Stack

### Frontend

- React
- Vite
- React Router
- Socket.IO Client
- React Leaflet
- Leaflet

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- Redis client
- Redis / Valkey
- JWT
- Cookie authentication
- CORS

### Deployment / Infrastructure

- **Vercel** — frontend hosting
- **Render Web Service** — backend hosting
- **Render Key Value / Valkey** — live state storage
- **MongoDB Atlas** — cloud database

### External Services

- OSRM — road routing and road distance
- OpenStreetMap — map data / tiles

---

## 🌱 Environment Variables

### Backend

`backend/.env`

```env
PORT=8000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
REDIS_URL=your_redis_url
FRONTEND_URL=http://localhost:5173
```

Production:

```env
PORT=8000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
REDIS_URL=your_render_key_value_internal_url
FRONTEND_URL=https://ride-flow-liard.vercel.app
```

### Frontend

`frontend/.env`

```env
VITE_API_URL=http://localhost:8000
VITE_SOCKET_URL=http://localhost:8000
```

Production:

```env
VITE_API_URL=https://riderflow-backend.onrender.com
VITE_SOCKET_URL=https://riderflow-backend.onrender.com
```

> Never place secrets such as `JWT_SECRET`, MongoDB credentials, or private Redis URLs in frontend environment variables.

---

## 🚀 Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/Ronak206/RideFlow.git
cd RideFlow
```

### 2. Start the backend

```bash
cd backend
npm install
npm start
```

The backend runs on port `8000` by default.

### 3. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite development server normally runs on:

```text
http://localhost:5173
```

### 4. Local services

Make sure your local MongoDB connection and Redis/Memurai instance are available and match the values in `backend/.env`.

---

## 📁 Project Structure

```text
RideFlow/
│
├── backend/
│   ├── controller/
│   ├── middleware/
│   ├── model/
│   ├── routes/
│   ├── service/
│   ├── socket/
│   ├── .env.example
│   ├── index.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── component/
│   │   ├── pages/
│   │   └── config/
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🔒 Security & Production Notes

- `.env` files should not be committed to GitHub.
- Production frontend/backend origins must be configured correctly in CORS.
- Socket.IO CORS must allow the deployed frontend origin and credentials.
- Cookie authentication must use secure cross-site settings in production.
- REST endpoints should use authentication middleware when they depend on `req.user`.
- Driver GPS input is validated for valid latitude/longitude ranges.
- Trip acceptance is constrained by trip status and driver ownership.
- Live trip data is deleted from Redis when a trip is completed or cancelled.

---

## 🎯 Project Highlights

This project demonstrates several backend and real-time concepts in one application:

- Role-based rider/driver authentication
- Cookie-based JWT sessions
- REST API design with Express
- MongoDB schema design with Mongoose
- GeoJSON and MongoDB geospatial queries
- `2dsphere` indexes and `$near`
- Real-time communication with Socket.IO
- Private Socket.IO rooms
- Browser geolocation
- Backend-generated road routing
- Redis / Valkey for ephemeral state
- Race-safe trip acceptance
- Automatic destination detection using road distance
- Real-time UI synchronization after trip completion
- Vercel + Render production deployment
- Environment-based API and Socket.IO URLs

---

## 🔮 Future Improvements

Possible next improvements include:

- Driver ETA calculation
- Better driver matching and dispatch logic
- More efficient route recalculation intervals
- Redis-based driver presence/location indexing
- Trip notifications and alerts
- In-app chat between rider and driver
- Payment integration
- Production monitoring and error tracking
- Rate limiting and stronger API validation
- Better mobile responsiveness

---

## 📌 Current Product Flow

```text
Rider signs up / logs in
          ↓
Select pickup + destination
          ↓
Backend calculates road distance + fare
          ↓
Find nearby online drivers
          ↓
Drivers receive real-time request
          ↓
Driver accepts
          ↓
Driver starts ride
          ↓
Driver GPS → Socket.IO
          ↓
Backend → OSRM route calculation
          ↓
Redis / Valkey live state
          ↓
Rider receives live updates
          ↓
Destination reached OR driver completes ride
          ↓
Trip marked completed
          ↓
Rider history updates in real time
```

---

## 📄 License

This project is a personal/portfolio ride-sharing application created for learning, development, and demonstration purposes.4

**Built with ❤️ by Ronak Rathod | Open to contributions**
