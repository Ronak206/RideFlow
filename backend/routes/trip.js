const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  HandleCreateTrip,
  HandleShowTrip,
  HandleAcceptTrip,
  HandleGetDriverTrip,
  HandleTripHistory,
  HandleCurrentTrip,
  HandleStartTrip,
  HandleDeleteTrip,
  HandleCurrentLiveTrip,
  HandleCancelCurrentTrip,
  HandleCompleteTrip,
} = require("../controller/tripController");

router.post("/", authMiddleware, HandleCreateTrip);
router.patch("/start", authMiddleware, HandleStartTrip);
router.patch("/complete", authMiddleware, HandleCompleteTrip);
router.patch("/", authMiddleware, HandleAcceptTrip);
router.patch("/current/cancel", authMiddleware, HandleCancelCurrentTrip);
router.get("/", authMiddleware, HandleShowTrip);
router.get("/history", authMiddleware, HandleTripHistory);
router.get("/current", authMiddleware, HandleCurrentTrip);
router.get("/current/live", authMiddleware, HandleCurrentLiveTrip);
router.get("/:id", authMiddleware, HandleGetDriverTrip);
router.delete("/:id", authMiddleware, HandleDeleteTrip);

module.exports = router;
