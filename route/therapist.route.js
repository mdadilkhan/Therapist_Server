const express = require("express");
const authenticateToken = require("../middleware/authToken.middleware");
const {
  getTherapistList,
  getTherapistDetail,
  updateTherapistDetail,
  getTherapistSessionSlots,
  getTherapistPreconsultationSlots,
  getMonthlyAppointmentData,
  getEarningsAndCounts,
  getAppointmentEarningsByType,
  getAppoitnmentEarningpermonth,
} = require("../controller/therapist.controller");
// Import the controllers

// Create a new router
const therapistRouter = express.Router();

// Define the routes using authRouter, not router

therapistRouter.get("/listOfTherapist", authenticateToken, getTherapistList);
therapistRouter.get(
  "/therapistDetail/:therapistId",
  authenticateToken,
  getTherapistDetail
);
therapistRouter.post(
  "/updateTherapistDetail",
  authenticateToken,
  updateTherapistDetail
);
therapistRouter.get(
  "/getTherapistSessionSlots",
  authenticateToken,
  getTherapistSessionSlots
);
therapistRouter.get(
  "/getPreconsultationSlotsByTherapist",
  authenticateToken,
  getTherapistPreconsultationSlots
);
therapistRouter.get(
  "/getMonthlyAppointmentData",
  authenticateToken,
  getMonthlyAppointmentData
);
therapistRouter.post(
  "/getEarningsAndCounts",
  authenticateToken,
  getEarningsAndCounts
);
therapistRouter.get(
  "/getAppointmentEarningsByType",
  authenticateToken,
  getAppointmentEarningsByType
);
therapistRouter.get(
  "/getAppoitnmentEaringpermonth",
  authenticateToken,
  getAppoitnmentEarningpermonth
);
// Export the router
module.exports = therapistRouter;
