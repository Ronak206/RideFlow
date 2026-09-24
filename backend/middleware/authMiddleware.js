const { getUser } = require("../service/auth");

function authMiddleware(req, res, next) {
  const token = req.cookies.uid;

  if (!token) {
    return res.status(401).json({
      message: "No token provided, please login",
    });
  }

  const user = getUser(token);

  if (!user) {
    return res.status(401).json({
      message: "Invalid or expired token, please login again",
    });
  }

  req.user = user;

  if (req.user?.role === "driver") {
    req.driver = user;
  }

  next();
}

module.exports = authMiddleware;
