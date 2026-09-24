const cookie = require("cookie");
const { getUser } = require("../service/auth");

function socketAuthMiddleware(socket, next) {
  try {
    const cookieHeader = socket.handshake.headers.cookie;

    if (!cookieHeader) {
      return next(new Error("Authentication required"));
    }

    const cookies = cookie.parse(cookieHeader);

    const token = cookies.uid;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const user = getUser(token);

    if (!user) {
      return next(new Error("Invalid or expired token"));
    }

    socket.user = user;

    next();
  } catch (error) {
    next(new Error("Socket authentication failed"));
  }
}

module.exports = socketAuthMiddleware;
