const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const driverRoutes = require("./routes/driver");
const tripRoutes = require("./routes/trip");

const { connectToDB } = require("./service/server");
const { connectRedis } = require("./service/redis");

const socketAuthMiddleware = require("./middleware/socketAuthMiddleware");
const registerTripSocket = require("./socket/tripSocket");

const { getRoute } = require("./service/routeService");

require("dotenv").config();

const app = express();

const PORT = 8000;

// Create Http Server
const server = http.createServer(app);

// Create Socket.io server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

// Use socket authentication middleware
io.use(socketAuthMiddleware);

// Register trip socket events
registerTripSocket(io);

// Connect to MongoDB
connectToDB();
connectRedis();

app.set("io", io);

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/trip", tripRoutes);

server.listen(PORT, () => {
  console.log(`Server running at port:${PORT}`);
});
