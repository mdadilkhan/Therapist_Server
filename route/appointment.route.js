const express = require('express');
const authenticateToken = require('../middleware/authToken.middleware');
const { getPreconsultationSlots, bookPreconsultationAppointment, bookAppointment, getTherapistSlots, generateTherapistSlots, getAppointmentDetail, getAllAppointmentsByType, rescheduleAppointment, reschedulePreconsultationAppointment, cancelAppointment, cancelPreconsultationAppointment, getUpcomingAppointments, bookAppointmentByTherapist, addPrescription, changeBookingStatus, rescheduleAppointmentByTherapist, cancelAppointmentByTherapist, getPastAppointments, getPrescriptionList, deleteTherapistSlot, getTherapistPreconsultationSlots, generateTherapistPreconsultationSlots, deleteTherapistPreconsultationSlots, bookSupervisionAppointment, getAllSupervision, rescheduleSupervisionAppointment, bookSelfTherapyAppointment, rescheduleSelfTherapyAppointment, getAllSelfTherapy, getSelfTherapySlots, generateSlots } = require('../controller/appointment.controller');
// Import the controllers


// Create a new router
const appointmentRouter = express.Router();

// Define the routes using authRouter, not router

appointmentRouter.post('/getPreconsultationSlots', authenticateToken, getPreconsultationSlots);
appointmentRouter.post('/bookPreconsultationAppointment', authenticateToken, bookPreconsultationAppointment);
appointmentRouter.post('/bookAppointment', authenticateToken, bookAppointment);
appointmentRouter.post('/getTherapistSlots', authenticateToken, getTherapistSlots);
appointmentRouter.post('/generateTherapistSlots', authenticateToken, generateTherapistSlots);
appointmentRouter.post('/getTherapistPreconsultationSlots', authenticateToken, getTherapistPreconsultationSlots);
appointmentRouter.post('/generateTherapistPreconsultationSlots', authenticateToken, generateTherapistPreconsultationSlots);
appointmentRouter.post('/getAppointmentDetail', authenticateToken, getAppointmentDetail);
appointmentRouter.get('/getAllAppointmentsByType/:type', authenticateToken, getAllAppointmentsByType);
appointmentRouter.post('/rescheduleAppointment', authenticateToken, rescheduleAppointment);
appointmentRouter.post('/reschedulePreconsultationAppointment', authenticateToken, reschedulePreconsultationAppointment);
appointmentRouter.post('/cancelAppointment', authenticateToken, cancelAppointment);
appointmentRouter.post('/cancelPreconsultationAppointment', authenticateToken, cancelPreconsultationAppointment);
appointmentRouter.get('/getUpcomingAppointments/:type', authenticateToken, getUpcomingAppointments);
appointmentRouter.get('/getPastAppointments/:type', authenticateToken, getPastAppointments);
appointmentRouter.get('/getPrescriptionList/:appointmentId', authenticateToken, getPrescriptionList);
appointmentRouter.post('/bookAppointmentByTherapist', authenticateToken, bookAppointmentByTherapist);
appointmentRouter.post('/rescheduleAppointmentByTherapist', authenticateToken, rescheduleAppointmentByTherapist);
appointmentRouter.post('/cancelAppointmentByTherapist', authenticateToken, cancelAppointmentByTherapist);
appointmentRouter.post('/addPrescription', authenticateToken, addPrescription);
appointmentRouter.post('/changeBookingStatus', authenticateToken, changeBookingStatus);
appointmentRouter.post('/deleteTherapistSlot', authenticateToken, deleteTherapistSlot);
appointmentRouter.post('/deleteTherapistPreconsultationSlots', authenticateToken, deleteTherapistPreconsultationSlots);
appointmentRouter.post('/bookSupervisionAppointment', authenticateToken, bookSupervisionAppointment);
appointmentRouter.post('/rescheduleSupervisionAppointment/:supervisionId', authenticateToken, rescheduleSupervisionAppointment);
appointmentRouter.get('/getAllSupervision', authenticateToken, getAllSupervision);
appointmentRouter.post('/bookSelfTherapyAppointment', authenticateToken, bookSelfTherapyAppointment);
appointmentRouter.post('/rescheduleSelfTherapyAppointment/:selftherapyId', authenticateToken, rescheduleSelfTherapyAppointment);
appointmentRouter.get('/getAllSelfTherapy', authenticateToken, getAllSelfTherapy);
appointmentRouter.post('/generateSlots', authenticateToken, generateSlots);
appointmentRouter.post('/getSelfTherapySlots', authenticateToken, getSelfTherapySlots);
// Export the router
module.exports = appointmentRouter;