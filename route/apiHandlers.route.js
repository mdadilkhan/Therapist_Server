const express = require('express');
const authenticateToken = require('../middleware/authToken.middleware');
const { getSpeciality, getStateList, getConcern, generateOTPs, validateOTP, sendMeetLink, getProfileDetail, getDashboardCounter, uploadImage, registration, addWalletAmount, getWalletDetails } = require('../controller/apiHandlers.controller');


// Create a new router
const apiHandlersRouter = express.Router();

// Define the routes using authRouter, not router

apiHandlersRouter.get('/getSpeciality', authenticateToken, getSpeciality);
apiHandlersRouter.get('/getStateList', authenticateToken, getStateList);
apiHandlersRouter.get('/getConcern', authenticateToken, getConcern);
apiHandlersRouter.get('/validateOTP', authenticateToken, validateOTP);
apiHandlersRouter.get('/generateOTPs', authenticateToken, generateOTPs);
apiHandlersRouter.post('/sendMeetLink', authenticateToken, sendMeetLink);
apiHandlersRouter.get('/getProfileDetail', authenticateToken, getProfileDetail);
apiHandlersRouter.get('/getDashboardCounter', authenticateToken, getDashboardCounter);
apiHandlersRouter.get('/uploadImage', authenticateToken, uploadImage);
apiHandlersRouter.post('/addWalletAmount', authenticateToken, addWalletAmount);
apiHandlersRouter.get('/getWalletDetails', authenticateToken, getWalletDetails);
apiHandlersRouter.post('/registration', registration);
// Export the router
module.exports = apiHandlersRouter;