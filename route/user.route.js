const express = require('express');
const authenticateToken = require('../middleware/authToken.middleware');
const { getAllUser, uploadProfilePicture, uploadClientProfilePicture, updateUserProfileDetail, getAllPrescriptionsByUser, getAllUsersByTherapist } = require('../controller/user.controller');
const { userDetails, addUser, getAllTherapistUsers, getUserDetails, addClientHistory, editSessionNotes, getAllSessionNotesByAppointmentId, getSessionNotesById, getAllSessionNotesByUserId, getUserDetailsByEmail, addSessionNotes, getClientHistory, editUser, sendSessionNotes, acceptSessionNotes } = require('../controller/user.controller');
// Import the controllers


// Create a new router
const userRouter = express.Router();

// Define the routes using authRouter, not router

userRouter.get('/user/userDetails', authenticateToken, userDetails);
userRouter.post('/addUser', authenticateToken, addUser);
userRouter.post('/editUser', authenticateToken, editUser);
userRouter.get('/getAllTherapistUsers/:type', authenticateToken, getAllTherapistUsers);
userRouter.get('/getAllUsersByTherapist', authenticateToken, getAllUsersByTherapist);
userRouter.get('/getUserDetails/:id', authenticateToken, getUserDetails);
userRouter.get('/getClientHistory/:id', authenticateToken, getClientHistory);
userRouter.post('/addClientHistory', authenticateToken, addClientHistory);
userRouter.post('/addSessionNotes', authenticateToken, addSessionNotes);
userRouter.post('/editSessionNotes', authenticateToken, editSessionNotes);
userRouter.post('/getAllSessionNotesByAppointmentId', authenticateToken, getAllSessionNotesByAppointmentId);
userRouter.post('/getSessionNotesById', authenticateToken, getSessionNotesById);
userRouter.post('/getAllSessionNotesByUserId', authenticateToken, getAllSessionNotesByUserId);
userRouter.post('/getUserDetailsByEmail', authenticateToken, getUserDetailsByEmail);
userRouter.get('/user/getAllUser', authenticateToken, getAllUser);
userRouter.post('/sendSessionNotes', authenticateToken, sendSessionNotes);
userRouter.post('/acceptSessionNotes', authenticateToken, acceptSessionNotes);
userRouter.post('/uploadProfilePicture', authenticateToken, uploadProfilePicture);
userRouter.post('/uploadClientProfilePicture', authenticateToken, uploadClientProfilePicture);
userRouter.post('/updateUserProfileDetail', authenticateToken, updateUserProfileDetail);
userRouter.get('/getAllPrescriptionsByUser', authenticateToken, getAllPrescriptionsByUser);
// Export the router
module.exports = userRouter;