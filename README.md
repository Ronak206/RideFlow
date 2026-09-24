# RideFlow — Mini Uber-style Dispatch & Live Tracking System

A backend-heavy project to learn **API design, database design, gRPC, Socket.io, Kafka, and Redis** by solving the same core problem Uber's engineering team solves: matching riders to nearby drivers and tracking rides in real time.

---

## Problem We're Solving

Ride-hailing apps need to:

1. Find the **nearest available driver** to a rider, fast — without scanning every driver's location in a slow DB query.
2. Keep **driver location updated in real time** and pushed live to the rider (not polled every few seconds).
3. Handle **many services reacting to the same event** (a completed ride triggers billing, analytics, and rating flows independently) without one slow service blocking another.
4. Let internal services (matching, driver, notification) talk to each other **fast and reliably**, separate from the public-facing rider/driver APIs.

This is a genuinely hard systems problem — not a CRUD app — which is why it forces real use of every technology below.

---

## Tech Stack & Why Each Piece Exists

| Tech                | Used For                                                                                      | Why It's Necessary (not optional)                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Database design** | Riders, drivers, trips, ratings tables                                                        | Core relational data — but "current driver location" (changes every second) should NOT live here                           |
| **Redis**           | Live driver locations via `GEOADD` / `GEORADIUS`; "nearest N drivers" queries                 | A SQL scan over lat/long for every GPS ping doesn't scale — Redis geo commands exist exactly for this                      |
| **Kafka**           | Events: `ride-requested`, `driver-assigned`, `trip-completed`                                 | Matching, billing, and analytics services all need the same event independently — Kafka decouples producers from consumers |
| **Socket.io**       | Live driver location + ETA pushed to rider's app                                              | Polling "where's my driver" every 2s doesn't scale — this is the real reason WebSockets exist                              |
| **gRPC**            | Internal service-to-service calls (e.g. Matching → Driver: "is this driver still available?") | Low-latency, frequent, internal calls — the right tool vs REST for service-to-service                                      |
| **REST API design** | Public rider/driver-facing endpoints                                                          | You'll learn when to use REST (public, less frequent) vs gRPC (internal, high frequency)                                   |

---

## Services to Build

1. **Rider Service** — REST API: request ride, cancel ride, view ride history
2. **Driver Service** — REST API: go online/offline, accept/reject ride request
3. **Location Service** — ingests live GPS pings from drivers, writes to Redis
4. **Matching Service** — finds nearest available driver using Redis geo queries
5. **Notification Service** — pushes live status/location updates to rider and driver via Socket.io

---

## Suggested Build Order

### Week 1–2: Foundation

- Design DB schema (riders, drivers, trips, ratings)
- Build basic REST APIs: request ride, driver accept/reject
- No real-time yet — just CRUD + relations

### Week 3: Matching

- Add Redis geo commands
- Build "find nearest available driver" logic

### Week 4: Real-time

- Add Socket.io
- Push live driver location + trip status to rider's client

### Week 5: Event-driven architecture

- Add Kafka
- Decouple ride events (`ride-requested`, `trip-completed`) from matching logic
- Add a second consumer (e.g. a simple billing/analytics service) to feel _why_ Kafka matters

### Week 6: Microservices + gRPC

- Split into 2–3 actual separate services (e.g. Matching Service, Driver Service)
- Connect them via gRPC instead of REST for internal calls

---

## What Success Looks Like

By the end, you should be able to explain and demo:

- Why driver location lives in Redis, not the main DB
- Why Kafka sits between "ride requested" and everything that reacts to it
- Why the rider's app gets live updates via Socket.io instead of polling
- Why internal services talk over gRPC instead of REST
- A real DB schema that handles riders, drivers, trips, and ratings correctly

This maps directly to systems Uber's engineering blog documents publicly — useful both as a portfolio project and as system-design interview prep.

MONGODB..
**Table**

User:
name
email
password

API:-
POST - /auth/signup
POST - /auth/login
POST - /auth/logout

    GET - user/
    GET - user/:id
    PATCH - user/
    DELETE - user/:id

    (expect GET :id use id from cookie)
    GET - driver/

- GET - driver/:id
  PUT - driver/
  DELETE - driver/

Driver:
User
status [online, offline]
rating
vehicleName
vehiclePlateNumber
lastLocation

Trip:
Driver
User
sourceCordinate
destinationCordinate
price
status [ requested, accepted, ongoing, completed, cancelled ]

REDIS...

USER

Rider :- rider@gmail.com, 123321
Rider :- rider1@gmail.com, 123321
Rider :- rider2@gmail.com, 123321

Driver:- driver@gmail.com, 123321
Dricer:- driver1@gmail.com, 123321
Driver:- driver2@gmail.com, 123321

redis: PORT: 6379
have to check authmiddle
