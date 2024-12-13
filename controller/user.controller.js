const { ObjectId } = require("mongodb");
const { getDb } = require("../db/db");
const moment = require("moment");
const {sendTemplatedEmail} = require('../SES/ses.js')
const userDetails = async (req, res) => {
  try {
    const user = req.user;

    return res.status(200).json({
      message: "User details",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
    });
  }
};

const addUser = async (req, res) => {
  try {
    const db = getDb();
    const usersCollection = db.collection("users");

    // Destructure the request body
    const { name, gender, emailId, phoneNumber, dob, address, city } = req.body;

    // Validate required fields
    if (
      !name ||
      !gender ||
      !emailId ||
      !phoneNumber ||
      !dob ||
      !address ||
      !city
    ) {
      return res.status(400).json({
        message: "All fields are required.",
        error: true,
      });
    }

    // Create a new user object with profile_details
    const newUser = {
      name: name,
      email: emailId,
      phone_number: phoneNumber,
      role: "user",
      profile_details: {
        gender: gender,
        dob: new Date(dob),
        address: `${address}, ${city}`,
      },
      created_at: new Date().toISOString(),
      referred_by: "Enso Product",
    };

    // Insert the new user into the database
    const result = await usersCollection.insertOne(newUser);

    // Fetch the inserted user document
    const insertedUser = await usersCollection.findOne(
      { _id: result.insertedId },
      { projection: { password: 0 } }
    );

    const templateData = {
      email: 'khanmdadil094@gmail.com',
      phone: '9122672984',
      websiteLink: 'https://covid-19-tracker-fc5dd.web.app/client',
    };
    await sendTemplatedEmail([emailId], "AddUser", templateData);
    return res.status(201).json({
      message: "User added successfully.",
      user: insertedUser,
    });
  } catch (error) {
    console.log("Error adding user:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const editUser = async (req, res) => {
  try {
    const db = getDb();
    const userCollection = db.collection("users");

    const { userId, name, phoneNumber, email, dateOfBirth, gender, address } =
      req.body;

    const updateData = {
      name,
      email,
      phone_number: phoneNumber,
      "profile_details.gender": gender,
      "profile_details.address": address,
      "profile_details.dob": dateOfBirth,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    // Perform the update operation
    const result = await userCollection.updateOne(
      { _id: new ObjectId(userId), role: "user" },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "User not found or update data is invalid.",
        error: true,
      });
    }

    // Fetch the updated User details
    const updatedUser = await userCollection.findOne(
      { _id: new ObjectId(userId), role: "user" },
      { projection: { password: 0 } }
    );

    return res.status(200).json({
      message: "User details updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    console.log("Error updating User details:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getAllTherapistUsers = async (req, res) => {
  try {
    const db = getDb();
    const therapistDetails = req.user; // Assuming therapist_id is obtained from req.user
    const { type } = req.params; // Type of appointment, e.g., 'session', 'preconsultation'

    // Fetch appointments matching therapistId and type
    const appointments = await db
      .collection("appointments")
      .find({
        therapist_id: therapistDetails?._id,
        type: type,
      })
      .toArray();

    if (!appointments || appointments.length === 0) {
      return res.status(404).json({
        message: "No appointments found.",
        data: [],
      });
    }

    // Extract unique user_ids
    const uniqueUserIds = [
      ...new Set(appointments.map((app) => app.user_id.toString())),
    ];

    // Fetch user details for each unique user_id
    const users = await db
      .collection("users")
      .find({
        _id: { $in: uniqueUserIds.map((id) => new ObjectId(id)) },
      })
      .toArray();

    return res.status(200).json({
      message: "Unique users retrieved successfully.",
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getAllUsersByTherapist = async (req, res) => {
  try {
    const db = getDb();
    const therapistDetails = req.user; // Assuming therapist_id is obtained from req.user

    // Fetch appointments matching therapistId and type
    const appointments = await db
      .collection("appointments")
      .find({
        therapist_id: therapistDetails?._id,
      })
      .toArray();

    if (!appointments || appointments.length === 0) {
      return res.status(404).json({
        message: "No appointments found.",
        data: [],
      });
    }

    // Extract unique user_ids
    const uniqueUserIds = [
      ...new Set(appointments.map((app) => app.user_id.toString())),
    ];

    // Fetch user details for each unique user_id
    const users = await db
      .collection("users")
      .find({
        _id: { $in: uniqueUserIds.map((id) => new ObjectId(id)) },
        role:"user"
      })
      .toArray();

    return res.status(200).json({
      message: "Unique users retrieved successfully.",
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getUserDetails = async (req, res) => {
  try {
    const db = getDb();
    const userId = req.params; // Get the user ID from the URL parameter

    // Validate the ObjectId
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid user ID format.",
      });
    }

    // Fetch user details from the database
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      {
        projection: { appointments: 0, clientHistory: 0 },
      }
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      message: "User details retrieved successfully.",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getClientHistory = async (req, res) => {
  try {
    const db = getDb();
    const userId = req.params; // Get the user ID from the URL parameter

    // Validate the ObjectId
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid user ID format.",
      });
    }

    // Fetch only the clientHistory from the user's details
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { clientHistory: 1 } } // Exclude all other fields except clientHistory
    );

    if (!user || !user.clientHistory) {
      return res.status(404).json({
        message: "Client history not found.",
      });
    }

    return res.status(200).json({
      message: "Client history retrieved successfully.",
      data: user.clientHistory,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getUserDetailsByEmail = async (req, res) => {
  try {
    const db = getDb();
    const { emailId } = req.body; // Get the user ID from the URL parameter

    // Validate the ObjectId
    if (!emailId) {
      return res.status(400).json({
        message: "Email Id is required",
      });
    }

    // Fetch user details from the database
    const user = await db
      .collection("users")
      .findOne({ email: emailId }, { projection: { password: 0 } });

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      message: "User details retrieved successfully.",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const addClientHistory = async (req, res) => {
  try {
    const db = getDb();

    const {
      userId,
      name,
      age,
      dateOfIntake,
      familyCurrentSituation,
      familyHistory,
      presentingProblem,
      pertinentHistory,
      tentativeGoalsAndPlans,
      observations,
      specialNeeds,
      diagnostic,
      riskBehaviors,
      appearance,
      speech,
      thoughtProcessContent,
      appetite,
      behavior,
      orientation,
      affect,
      mood,
      judgement,
      sleep,
      concern,
      imageUrl,
      importantNotes
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    const clientHistory = {
      name,
      age,
      dateOfIntake,
      familyCurrentSituation,
      familyHistory,
      presentingProblem,
      pertinentHistory,
      tentativeGoalsAndPlans,
      observations,
      specialNeeds,
      diagnostic,
      riskBehaviors,
      appearance,
      speech,
      thoughtProcessContent,
      appetite,
      behavior,
      orientation,
      affect,
      mood,
      judgement,
      sleep,
      concern,
      imageUrl,
      importantNotes
    };

    const userCollection = await db.collection("users");
    const result = await userCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { clientHistory: clientHistory } }
    );

    if (result.matchedCount === 0) {
      return res.status(400).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      message: "Client history added successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const addSessionNotes = async (req, res) => {
  try {
    const db = getDb();
       console.log(">>",req.body);
       
        const {
            appointmentId,
            diagnosticImpression,
            sessionFocus,
            observations,
            clientGoals,
            therapeuticIntervention,
            tasksGiven,
            plannedIntervention,
            importantNotes,
            imageName,
        } = req.body;

        if (!appointmentId) {
            return res.status(400).json({
                message: "Missing appointment ID.",
                error: true,
            });
        }

        if (!ObjectId.isValid(appointmentId)) {
            return res.status(400).json({
                message: "Invalid appointment ID.",
                error: true,
            });
        }

        const appointmentCollection = await db.collection('appointments');
        const appointment = await appointmentCollection.findOne({ _id: new ObjectId(appointmentId) });

        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found.",
                error: true,
            });
        }

        const userId = appointment.user_id;
        const therapistId = appointment.therapist_id

        const sessionNote = {
            appointmentId: new ObjectId(appointmentId),
            userId: new ObjectId(userId),
            therapistId: therapistId,
            diagnosticImpression,
            sessionFocus,
            observations,
            clientGoals,
            therapeuticIntervention,
            tasksGiven,
            plannedIntervention,
            importantNotes,
            attachment:imageName,
            noteStatus: "private",  // Default status
            sharedWith: [],  // Stores therapist IDs who accepted the notes
            created_at: moment().toISOString(),
        };

        const sessionNotesCollection = await db.collection('sessionNotes');

        const result = await sessionNotesCollection.insertOne(sessionNote);

        if (!result.insertedId) {
            return res.status(500).json({
                message: "Failed to add session note.",
                error: true,
            });
        }

        return res.status(200).json({
            message: "Session notes added successfully.",
            data: sessionNote,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.toString(),
        });
    }

};

const editSessionNotes = async (req, res) => {
  try {
    const db = getDb();
    const therapist = req.user;
    console.log(req.body);
    
    const {
      _id,
      appointmentId,
      diagnosticImpression,
      sessionFocus,
      observations,
      clientGoals,
      therapeuticIntervention,
      tasksGiven,
      plannedIntervention,
      importantNotes,
      imageName,
    } = req.body;
 
    
    if (!_id || !appointmentId) {
      return res.status(400).json({
        message: "Missing session ID or appointment ID.",
        error: true,
      });
    }

    if (!ObjectId.isValid(_id) || !ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        message: "Invalid session ID or appointment ID.",
        error: true,
      });
    }

    const sessionNotesCollection = await db.collection("sessionNotes");
    const sessionNote = await sessionNotesCollection.findOne({
      _id: new ObjectId(_id),
      $or: [
        { therapistId: new ObjectId(therapist._id) },
        { sharedWith: new ObjectId(therapist._id) },
      ],
    });

    if (!sessionNote) {
      return res.status(404).json({
        message: "Session note not found.",
        error: true,
      });
    }

    const appointmentCollection = await db.collection("appointments");
    const appointment = await appointmentCollection.findOne({
      _id: new ObjectId(appointmentId),
    });

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found.",
        error: true,
      });
    }

    const userId = appointment.user_id;

    const updatedSessionNote = {
      appointmentId: new ObjectId(appointmentId),
      userId: new ObjectId(userId),
      diagnostic:diagnosticImpression,
      sessionFocus,
      observations,
      clientGoals,
      therapeuticIntervention,
      tasksGiven,
      plannedIntervention,
      importantNotes,
      attachment:imageName,
      updated_at: moment().toISOString(),
    };

    const result = await sessionNotesCollection.updateOne(
      { _id: new ObjectId(_id) },
      { $set: updatedSessionNote }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({
        message: "Failed to update session note.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Session notes updated successfully.",
      data: updatedSessionNote,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getAllSessionNotesByAppointmentId = async (req, res) => {
  try {
    const db = getDb();
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        message: "Missing required field: appointmentId.",
        error: true,
      });
    }

    if (!ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        message: "Invalid appointment ID.",
        error: true,
      });
    }

    const sessionNotesCollection = await db.collection("sessionNotes");
    const sessionNotes = await sessionNotesCollection.find({appointmentId: new ObjectId(appointmentId)}).toArray();

    if (!sessionNotes.length) {
      return res.status(404).json({
        message: "No session notes found for the given appointment ID.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Session notes retrieved successfully.",
      data: sessionNotes,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getSessionNotesById = async (req, res) => {
  try {
    const db = getDb();
    const { sessionId } = req.body;
    const therapist = req.user;

    if (!sessionId) {
      return res.status(400).json({
        message: "Missing required field: sessionId.",
        error: true,
      });
    }

    if (!ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        message: "Invalid session ID.",
        error: true,
      });
    }

    const sessionNotesCollection = await db.collection("sessionNotes");
    const sessionNote = await sessionNotesCollection.findOne({
      _id: new ObjectId(sessionId),
      $or: [
        { therapistId: new ObjectId(therapist._id) },
        { sharedWith: new ObjectId(therapist._id) },
      ],
    });

    if (!sessionNote) {
      return res.status(404).json({
        message: "Session note not found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Session note retrieved successfully.",
      data: sessionNote,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getAllSessionNotesByUserId = async (req, res) => {
  try {
    const { userId } = req.body;
    const therapist = req.user;

    if (!userId) {
      return res.status(400).json({
        message: "Missing required fields: userId .",
        error: true,
      });
    }

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid userId.",
        error: true,
      });
    }

    const db = getDb();
    const sessionNotesCollection = db.collection("sessionNotes");

    // Fetch notes created by the therapist or notes shared and accepted by the therapist
    const sessionNotes = await sessionNotesCollection
      .find({
        userId: new ObjectId(userId),
        $or: [
          { therapistId: new ObjectId(therapist._id) },
          { sharedWith: new ObjectId(therapist._id) },
        ],
      })
      .toArray();

    if (!sessionNotes.length) {
      return res.status(404).json({
        message: "No session notes found for the given user and therapist.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Session notes retrieved successfully.",
      data: sessionNotes,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getAllUser = async (req, res) => {
  try {
    const db = getDb();
    const users = await db.collection("users").find({ role: "user" }).toArray();
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

const sendSessionNotes = async (req, res) => {
  try {
    const db = getDb();
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({
        message: "Missing required field: userId.",
        error: true,
      });
    }

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid userId.",
        error: true,
      });
    }

    const referralsCollection = db.collection("referrals");
    const sessionNotesCollection = db.collection("sessionNotes");

    // Fetch the referral for the given userId
    const referral = await referralsCollection.findOne({
      client_id: new ObjectId(userId),
    });

    if (!referral) {
      return res.status(404).json({
        message: "Referral not found for the given user.",
        error: true,
      });
    }

    // Assuming the `therapists` array contains the referred therapists, find the relevant therapist
    const referredTherapist = referral.therapists.find(
      (therapist) => therapist.status === "accepted"
    );

    if (!referredTherapist) {
      return res.status(404).json({
        message: "No referred therapist found who accepted the referral.",
        error: true,
      });
    }

    const referredTherapistId = referredTherapist.therapist_id;

    // Find all session notes related to the user
    const sessionNotes = await sessionNotesCollection
      .find({ userId: new ObjectId(userId) })
      .toArray();
    if (!sessionNotes.length) {
      return res.status(404).json({
        message: "No session notes found for the given user.",
        error: true,
      });
    }

    // Update all session notes to add the referred therapist and set noteStatus to "shared"
    const result = await sessionNotesCollection.updateMany(
      { userId: new ObjectId(userId) },
      {
        $addToSet: { sharedWith: new ObjectId(referredTherapistId) },
        $set: { noteStatus: "shared" },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({
        message: "Failed to send session notes.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Session notes shared successfully.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const acceptSessionNotes = async (req, res) => {
  try {
    const db = getDb();
    const { therapistId } = req.body;
    const user = req.user;

    if (!therapistId) {
      return res.status(400).json({
        message: "Missing required fields: userId or therapistId.",
        error: true,
      });
    }

    if (!ObjectId.isValid(therapistId)) {
      return res.status(400).json({
        message: "Invalid userId or therapistId.",
        error: true,
      });
    }

    const sessionNotesCollection = db.collection("sessionNotes");

    // Find all session notes related to the user that are shared with this therapist
    const sessionNotes = await sessionNotesCollection
      .find({
        userId: new ObjectId(user._id),
        sharedWith: new ObjectId(therapistId),
      })
      .toArray();

    if (!sessionNotes.length) {
      return res.status(404).json({
        message:
          "No session notes found to accept for the given user and therapist.",
        error: true,
      });
    }

    // Update all session notes to set noteStatus to "accepted"
    const result = await sessionNotesCollection.updateMany(
      {
        userId: new ObjectId(user._id),
        sharedWith: new ObjectId(therapistId),
      },
      { $set: { noteStatus: "accepted" } }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({
        message: "Failed to accept session notes.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Session notes accepted successfully.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const uploadProfilePicture = async (req, res) => {
  try {
    const db = getDb();
    const { imageUrl } = req.body;
    const therapist = req.user;
    if (!imageUrl || typeof imageUrl !== "string" || imageUrl.trim() === "") {
      return res.status(400).json({
        message: "Image URL is missing",
        error: true,
      });
    }

    const usersCollection = await db.collection("users");

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(therapist._id) },
      { $set: { profile_image: imageUrl.trim() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      message: "User image upload successfully.",
    });
  } catch {
    console.log("Error updating user:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const uploadClientProfilePicture = async (req, res) => {
  try {
    const db = getDb();
    const { imageUrl, userId } = req.body;
    if (!imageUrl || typeof imageUrl !== "string" || imageUrl.trim() === "") {
      return res.status(400).json({
        message: "Image URL is missing",
        error: true,
      });
    }

    const usersCollection = await db.collection("users");

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { profile_image: imageUrl.trim() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      message: "User image upload successfully.",
    });
  } catch {
    console.log("Error updating user:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const updateUserProfileDetail = async (req, res) => {
  try {
    const db = getDb();
    const userCollection = db.collection("users");

    const userDetails = req.user;

    const {
      name,
      phoneNumber,
      email,
      dob,
      gender,
      address,
      city,
      state,
      bloodGroup,
    } = req.body;

    // Required fields check
    const requiredFields = [
      "name",
      "phoneNumber",
      "email",
      "dob",
      "gender",
      "address",
      "city",
      "state",
      "bloodGroup",
    ];

    // Check if any required field is missing
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          message: `${field} is required.`,
          error: true,
        });
      }
    }

    if (!ObjectId.isValid(userDetails._id)) {
      return res.status(400).json({
        message: "Invalid user ID.",
        error: true,
      });
    }

    const updateData = {
      name,
      email,
      phone_number: phoneNumber,
      "profile_details.gender": gender,
      "profile_details.address": address,
      "profile_details.city": city,
      "profile_details.state": state,
      "profile_details.dob": dob,
      "profile_details.blood_group": bloodGroup,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    // Perform the update operation
    const result = await userCollection.updateOne(
      { _id: new ObjectId(userDetails._id), role: "user" },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "User not found or update data is invalid.",
        error: true,
      });
    }

    // Fetch the updated therapist details
    const updatedUsers = await userCollection.findOne(
      { _id: new ObjectId(userDetails._id), role: "user" },
      { projection: { password: 0 } }
    );

    return res.status(200).json({
      message: "User details updated successfully.",
      data: updatedUsers,
    });
  } catch (error) {
    console.log("Error updating therapist details:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getAllPrescriptionsByUser = async (req, res) => {
  try {
    const userDetails = req.user;

    // Validate the userId
    if (!userDetails) {
      return res.status(400).json({
        message: "Invalid user ID.",
        error: true,
      });
    }

    // Get a reference to the appointments collection
    const db = getDb();
    const appointmentsCollection = db.collection("appointments");

    // Find all appointments related to the user by userId
    const appointments = await appointmentsCollection
      .find({ user_id: new ObjectId(userDetails?._id) })
      .toArray();

    // Check if any appointments were found
    if (!appointments || appointments.length === 0) {
      return res.status(404).json({
        message: "No appointments found for the user.",
        error: true,
      });
    }

    // Extract prescriptions from all appointments
    const allPrescriptions = appointments
      .map((appointment) => appointment.prescriptions || []) // Default to an empty array if no prescriptions exist
      .flat(); // Flatten the array of arrays into a single array

    // Return the prescription list
    return res.status(200).json({
      message: "Prescriptions retrieved successfully.",
      data: allPrescriptions,
    });
  } catch (error) {
    console.error("Error retrieving prescriptions for user:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

module.exports = {
  userDetails,
  addUser,
  getAllTherapistUsers,
  getUserDetails,
  addClientHistory,
  addSessionNotes,
  editSessionNotes,
  getAllSessionNotesByAppointmentId,
  getSessionNotesById,
  getAllSessionNotesByUserId,
  getUserDetailsByEmail,
  getClientHistory,
  editUser,
  getAllUser,
  sendSessionNotes,
  acceptSessionNotes,
  uploadProfilePicture,
  uploadClientProfilePicture,
  updateUserProfileDetail,
  getAllPrescriptionsByUser,
  getAllUsersByTherapist
};
