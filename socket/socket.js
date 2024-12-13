const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const getUserDetailsFromToken = require("../helpers/getUserDetailsFromToken");
const app = express();
const { getDb } = require("../db/db");
const { ObjectId } = require("mongodb");

/***socket connection */
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://covid-19-tracker-fc5dd.web.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

let user; // Define user outside

// Mapping of userId to socketId
const userSockets = new Map();

io.use(async (socket, next) => {
  try {
    const { token } = socket.handshake.query;
    console.log(token, "Token in middleware");

    user = await getUserDetailsFromToken(token); // Pass the actual token
    console.log(user._id, "User detail from middleware user is comming from  token verification");

    if (user?.notvalid) {
      console.log("Invalid token or user not found");
      return next(
        new Error("Authentication error: User not valid or token expired")
      );
    }

    // Add user details to socket object if valid
    next(); // Allow the connection to proceed
  } catch (e) {
    console.log(e, "Error in socket middleware");
    next(new Error("Authentication error")); // Block the connection
  }
});

io.on("connection", async (socket) => {
  try {
    // Connection will only proceed if the middleware calls next()
    console.log("Socket connected", socket.id,user ,"user come after verification of token in middleware");

    // User details should now be available in socket.user (from the middleware)

    const count = io.engine.clientsCount;
    const sockets = await io.fetchSockets();

    // Log connected sockets
    for (const socket of sockets) {
      console.log(socket.id);
    }

    const db = getDb();
    const notifications = await db.collection("notifications");
    io.socketsJoin("room1");

    socket.on("notif", async (data) => {
      console.log(data, "User ID for mapping");
      if (data && socket.id) {
        userSockets.set(data.toString(), socket.id); // Ensure the user ID and socket ID are stored properly
        console.log(userSockets, "Mapping after setting");
      }

      const notificationdata = await notifications
        .find({ userId: data.toString() })
        .toArray();
      socket.emit("notifications", notificationdata);
    });

    // socket.on("referal", (data) => {
    //   const userIdList = data.userId;
    //   const socketIdList = userIdList
    //     .map((userId) => userSockets.get(userId))
    //     .filter(Boolean);
    //   console.log(socketIdList);
    //   const message = "Message for specific users";
    //   socketIdList.forEach((socketId) => {
    //     if (socketId) {
    //       io.to(socketId).emit("privateMessage", message);
    //     }
    //   });
    // });

    socket.on("therapist", async (data) => {
      console.log("Therapist event received:", data);
      console.log("therapist event called>>", new Date().toLocaleTimeString());

      data = {
        ...data,
        createdAt: new Date(),
      };
      await notifications.insertOne(data);
      console.log("Notification inserted:", data);

      console.log(userSockets, "mapped sockets");

      const recipientSocketId = userSockets.get(data?.userId);
      console.log(userSockets, "Current socket map for therapist event");
      if (recipientSocketId) {
        const updatedNotifications = await notifications
          .find({ userId: data?.userId })
          .toArray();
        io.to(recipientSocketId).emit("notifications", updatedNotifications);
        console.log(`Notification sent to user with ID: ${data.userId}`);
      } else {
        console.log(`User with ID ${data.userId} is not connected.`);
      }
    });

    socket.on("client", async (data) => {
      console.log("event trigger on ");
      console.log("client  event received:", data);

      data = {
        ...data,
        createdAt: new Date(),
      };
      await notifications.insertOne(data);
      console.log("Notification inserted:", data);
      const recipientSocketId = userSockets.get(data?.userId);

      console.log(recipientSocketId);
      if (recipientSocketId) {
        const updatedNotifications = await notifications
          .find({ userId: data?.userId })
          .toArray();
        io.to(recipientSocketId).emit("notifications", updatedNotifications);
        console.log(`Notification sent to user with ID: ${data.userId}`);
      } else {
        console.log(`User with ID ${data.userId} is not connected.`);
      }
    });

    socket.on("deleteNotification", async (data) => {
      const { notificationId, userId } = data; // Destructure directly from `data`
      console.log(userId, "::::", data); // This should print the userId and other data properly

      try {
        await notifications.deleteOne({ _id: new ObjectId(notificationId) });
        const updatedNotifications = await notifications
          .find({ userId: userId })
          .toArray();

        // Send the updated list back to the client
        socket.emit("notifications", updatedNotifications);
      } catch (err) {
        console.log(err, "Error in socket connection");
      }
    });
  } catch (err) {
    console.log(err, "Error in socket connection");
  }
});

module.exports = {
  server,
  app,
};
