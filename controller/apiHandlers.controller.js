const { ObjectId } = require("mongodb");
const { getDb } = require("../db/db");
const nodemailer = require("nodemailer");
const validator = require("validator");
const { sendSMS } = require("../SNS/sns");
const { sendTemplatedEmail } = require("../SES/ses");
const { generateSignedUrl } = require("../S3/s3");
const jwt = require("jsonwebtoken");
const indiaStates = [
  {
    state_id: 1,
    state_name: "Andaman and Nicobar Islands",
    location: "Islands",
  },
  { state_id: 2, state_name: "Andhra Pradesh", location: "Southern India" },
  {
    state_id: 3,
    state_name: "Arunachal Pradesh",
    location: "North-Eastern India",
  },
  { state_id: 4, state_name: "Assam", location: "North-Eastern India" },
  { state_id: 5, state_name: "Bihar", location: "Eastern India" },
  { state_id: 6, state_name: "Chandigarh", location: "Northern India" },
  { state_id: 7, state_name: "Chhattisgarh", location: "Central India" },
  {
    state_id: 8,
    state_name: "Dadra and Nagar Haveli",
    location: "Western India",
  },
  { state_id: 9, state_name: "Daman and Diu", location: "Western India" },
  { state_id: 10, state_name: "Delhi", location: "Northern India" },
  { state_id: 11, state_name: "Goa", location: "Western India" },
  { state_id: 12, state_name: "Gujarat", location: "Western India" },
  { state_id: 13, state_name: "Haryana", location: "Northern India" },
  { state_id: 14, state_name: "Himachal Pradesh", location: "Northern India" },
  { state_id: 15, state_name: "Jammu and Kashmir", location: "Northern India" },
  { state_id: 16, state_name: "Jharkhand", location: "Eastern India" },
  { state_id: 17, state_name: "Karnataka", location: "Southern India" },
  { state_id: 18, state_name: "Kerala", location: "Southern India" },
  { state_id: 19, state_name: "Ladakh", location: "Northern India" },
  { state_id: 20, state_name: "Lakshadweep", location: "Islands" },
  { state_id: 21, state_name: "Madhya Pradesh", location: "Central India" },
  { state_id: 22, state_name: "Maharashtra", location: "Western India" },
  { state_id: 23, state_name: "Manipur", location: "North-Eastern India" },
  { state_id: 24, state_name: "Meghalaya", location: "North-Eastern India" },
  { state_id: 25, state_name: "Mizoram", location: "North-Eastern India" },
  { state_id: 26, state_name: "Nagaland", location: "North-Eastern India" },
  { state_id: 27, state_name: "Odisha", location: "Eastern India" },
  { state_id: 28, state_name: "Puducherry", location: "Southern India" },
  { state_id: 29, state_name: "Punjab", location: "Northern India" },
  { state_id: 30, state_name: "Rajasthan", location: "Western India" },
  { state_id: 31, state_name: "Sikkim", location: "North-Eastern India" },
  { state_id: 32, state_name: "Tamil Nadu", location: "Southern India" },
  { state_id: 33, state_name: "Telangana", location: "Southern India" },
  { state_id: 34, state_name: "Tripura", location: "North-Eastern India" },
  { state_id: 35, state_name: "Uttar Pradesh", location: "Northern India" },
  { state_id: 36, state_name: "Uttarakhand", location: "Northern India" },
  { state_id: 37, state_name: "West Bengal", location: "Eastern India" },
];

const concern = [
  { name: "Addiction" },
  { name: "ADHD" },
  { name: "Adjustment Challenges" },
  { name: "Anger" },
  { name: "Anxiety" },
  { name: "Bipolar Affective Disorder" },
  { name: "Career Counseling" },
  { name: "Couple Therapy" },
  { name: "Depression" },
  { name: "Eating Disorders and Body Image" },
  { name: "Family Therapy" },
  { name: "General Wellbeing" },
  { name: "Grief and Trauma" },
  { name: "Loneliness" },
  { name: "Loss of Motivation" },
  { name: "Negative Thinking" },
  { name: "OCD" },
  { name: "Overthinking" },
  { name: "Procrastination" },
  { name: "Relationship and Marriage" },
  { name: "Self Esteem" },
  { name: "Sexual Dysfunction" },
  { name: "Sleep Disturbance" },
  { name: "Stress" },
];

const specialties = [
  { name: "Career and Guidance Psychologist" },
  { name: "CBT Practitioner" },
  { name: "Child and Adolescent Psychologist" },
  { name: "Clinical Psychologist" },
  { name: "Counseling Psychologist" },
  { name: "Deaddiction Psychologist" },
  { name: "Expressive Art Therapist" },
  { name: "Jungian-Oriented Therapist" },
  { name: "Hypnotherapist" },
  { name: "Psychiatrist" },
  { name: "Psychiatric Social Worker" },
  { name: "Psychotherapist" },
  { name: "Psycho Oncologist" },
  { name: "REBT Practitioner" },
];

const getStateList = async (req, res) => {
  try {
    return res.status(200).json({
      message: "State Retrive successfully",
      data: indiaStates,
    });
  } catch (error) {
    console.log("Error while getting location:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getConcern = async (req, res) => {
  try {
    return res.status(200).json({
      message: "Concern Retrive successfully",
      data: concern,
    });
  } catch (error) {
    console.log("Error while getting concern:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getSpeciality = async (req, res) => {
  try {
    return res.status(200).json({
      message: "specialties Retrive successfully",
      data: specialties,
    });
  } catch (error) {
    console.log("Error while getting specialties:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "mdadilakhtar8@gmail.com",
    pass: "btpzwrbvrikfhrxp",
  },
});

// Function to send meeting link
function sendMeet(therapist_email, user_email, meet_link, topic) {
  const mailOptions = {
    from: "mdadilakhtar8@gmail.com",
    to: `${therapist_email}, ${user_email}`,
    subject: `${topic}`,
    text: `Here is your meeting link for connecting the user with the therapist: ${meet_link}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });

  return meet_link;
}

// API to send meeting link
const sendMeetLink = async (req, res) => {
  console.log("Request received with body:", req.body);
  try {
    const db = getDb();

    const therapist = req.user;

    const { user_email, meet_link, topic } = req.body;

    if (!user_email || !validator.isEmail(user_email)) {
      return res
        .status(400)
        .json({ message: "Invalid email format.", error: true });
    }

    const meetLink = sendMeet(therapist.email, user_email, meet_link, topic);

    console.log(
      "Meeting link generated successfully for:",
      therapist_email,
      user_email
    );
    return res.status(200).json({
      message: "Meeting link generated successfully.",
      data: { meetLink },
    });
  } catch (error) {
    console.log("Error generating meeting link:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.toString() });
  }
};

// Function to generate OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

// Function to send OTP email
function sendOTPEmail(email) {
  const otp = generateOTP();

  const mailOptions = {
    from: "mdadilakhtar8@gmail.com",
    to: email,
    subject: "OTP Verification",
    text: `Your OTP for email verification: ${otp}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });

  return otp; // Return the OTP for further verification
}

// API to generate OTP
const generateOTPs = async (req, res) => {
  console.log("Request received with body:", req.body);
  try {
    const db = getDb();
    const { email } = req.body;
    const collection = await db.collection("users");

    if (!email || !validator.isEmail(email)) {
      return res
        .status(400)
        .json({ message: "Invalid email format.", error: true });
    }

    const otp = sendOTPEmail(email);
    console.log(otp);
    const user = await collection.findOneAndUpdate(
      { email: email },
      { $set: { otp: otp } },
      { returnOriginal: false }
    );

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found or inactive.", error: true });
    }

    console.log("OTP generated and saved successfully for:", email);
    return res
      .status(200)
      .json({ message: "OTP generated successfully.", data: { otp } });
  } catch (error) {
    console.log("Error generating OTP:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.toString() });
  }
};

// API to validate OTP
const validateOTP = async (req, res) => {
  console.log("Request received with body:", req.body);

  try {
    const db = getDb();
    const { email, phoneNumber, otp, role } = req.body;

    // Validate input: OTP, role, and either email or phoneNumber are required
    if (!otp || (!email && !phoneNumber)) {
      return res.status(400).json({
        message:
          "OTP, role, and either email or phone number are required (not both).",
        error: true,
      });
    }

    // Ensure role is either 'user' or 'therapist'
    // if (!['user', 'therapist'].includes(role)) {
    //   return res.status(400).json({ message: "Invalid role provided.", error: true });
    // }

    // Find user based on email or phone number
    const collection = await db.collection("users");
    const user = await collection.findOne({
      $or: [
        email ? { email: email } : null,
        phoneNumber ? { phone_number: phoneNumber } : null,
      ].filter(Boolean),
    });

    // If user not found
    if (!user) {
      return res.status(404).json({ message: "User not found.", error: true });
    }

    // Check if the OTP matches
    if (user.otp !== otp) {
      return res.status(401).json({ message: "Incorrect OTP.", error: true });
    }

    // Check if the user's role in the database matches the role provided in the request
    // if (user.role !== role) {
    //   return res.status(403).json({ message: `Access denied. The user is not a ${role}.`, error: true });
    // }

    // Successful validation
    console.log("OTP validated successfully for:", email || phoneNumber);

    // Generate token (for authentication purposes)
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1d" }
    );

    // Send token and user details in response
    console.log("user>>", user);

    return res.status(200).json({
      message: "Sign-in successful",
      data: {
        id: user._id,
        name: user.name,
        email: user.email || null,
        phoneNumber: user.phone_number || null,
        role: user.role,
        profile_image: user.profile_image,
        token,
      },
    });
  } catch (error) {
    console.error("Error validating OTP:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.toString() });
  }
};

const sendOtpWithSms = async (req, res) => {
  const { phoneNumber, countryCode } = req.body;

  // Validate the input
  if (!phoneNumber || !countryCode) {
    return res
      .status(400)
      .json({ message: "Phone number and country code are required." });
  }

  const db = getDb();
  const usersCollection = db.collection("users");

  try {
    // Check if user exists with the given phone number
    const user = await usersCollection.findOne({ phone_number: phoneNumber });
    console.log("user>>", user);

    if (!user) {
      return res
        .status(404)
        .json({ message: "User with this phone number does not exist." });
    }

    // Generate the OTP
    const otp = generateOTP();
    console.log(otp);
    console.log(typeof otp);

    // Save OTP directly in the user's document
    await usersCollection.updateOne(
      { phone_number: phoneNumber },
      { $set: { otp } }
    );

    // Send OTP via SMS
    const fullPhoneNumber = `${countryCode}${phoneNumber}`;
    console.log("fullPhoneNumber", fullPhoneNumber);

    const message = `Your OTP is ${otp}. Please do not share it with anyone.`;

    await sendSMS(fullPhoneNumber, message);

    res.status(200).json({ message: "OTP sent successfully." });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Failed to send OTP." });
  }
};

const sendOtpWithEmail = async (req, res) => {
  const { email } = req.body;

  // Validate the input
  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  const db = getDb();
  const usersCollection = db.collection("users");

  try {
    // Check if user exists with the given phone number
    const user = await usersCollection.findOne({ email });
    console.log("user>>", user);

    if (!user) {
      return res
        .status(404)
        .json({ message: "User with this email does not exist." });
    }

    // Generate the OTP
    const otp = generateOTP();
    console.log(otp);
    console.log(typeof otp);

    // Save OTP directly in the user's document
    await usersCollection.updateOne({ email }, { $set: { otp } });

    // Send OTP via SMS
    const templateData = {
      otp: otp.toString(),
    };

    // Ensure the email is an array, as required by the sendTemplatedEmail function
    await sendTemplatedEmail([user.email], "OTPAuthentication", templateData);

    res.status(200).json({ message: "OTP sent successfully." });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Failed to send OTP." });
  }
};

const getProfileDetail = async (req, res) => {
  try {
    const db = getDb();
    const profileDetails = req.user;

    const userCollection = await db.collection("users");
    // Query to find the profile by Object ID, excluding the password field
    const profile = await userCollection.findOne(
      { _id: new ObjectId(profileDetails._id) },
      { projection: { password: 0 } }
    );

    if (!profile) {
      return res.status(404).json({
        message: "Therapist not found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "profile details retrieved successfully.",
      data: profile,
    });
  } catch (error) {
    console.log("Error retrieving profile details:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getDashboardCounter = async (req, res) => {
  try {
    const db = getDb();
    const therapist = req.user; // Assuming therapist details are in req.user

    let totalClients = 0;
    let groupSessionsConducted = 0;
    let liveChats = 0;
    let todaysAppointments = 0;
    let todaysPreConsultations = 0;
    let referralsGiven = 0;
    let referralsReceived = 0;
    let faqRequests = 0;

    if (!therapist) {
      return res.status(400).json({
        message: "Invalid therapist details.",
        error: true,
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to start of the day
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Next day to compare less than tomorrow

    // Fetch therapist details from users collection
    const therapistDetails = await db.collection("users").findOne({
      _id: new ObjectId(therapist._id),
    });

    if (!therapistDetails) {
      return res.status(404).json({
        message: "Therapist not found.",
        error: true,
      });
    }

    // Set the groupSessionsConducted based on the length of groupSession array
    groupSessionsConducted = therapistDetails.groupSessation ? therapistDetails.groupSessation.length : 0;

    // Today's appointments (where the booking date is within today)
    todaysAppointments = await db
      .collection("appointments")
      .find({
        therapist_id: therapist._id,
        booking_date: {
          $gte: today, // Greater than or equal to today's date (start of day)
          $lt: tomorrow, // Less than tomorrow (end of today's day)
        },
      })
      .count();

    // Pre-consultations for today (where the booking date is within today)
    todaysPreConsultations = await db
      .collection("appointments")
      .find({
        therapist_id: therapist._id,
        type: "preconsultation",
        booking_date: {
          $gte: today, // Greater than or equal to today's date (start of day)
          $lt: tomorrow, // Less than tomorrow (end of today's day)
        },
      })
      .count();

    // Total clients (unique clients related to the therapist's appointments)
    const appointments = await db
      .collection("appointments")
      .find({
        therapist_id: therapist._id,
      })
      .toArray();

    const uniqueClientIds = [
      ...new Set(appointments.map((app) => app.user_id.toString())),
    ];

    totalClients = uniqueClientIds.length;

    // Given referrals
    referralsGiven = await db
      .collection("referrals")
      .find({
        referrer_id: new ObjectId(therapist._id),
      })
      .count();

    // Received referrals
    referralsReceived = await db
      .collection("referrals")
      .find({
        "therapists.therapist_id": therapist._id,
      })
      .count();

    // FAQ requests (assuming FAQs are related to this therapist)
    // const faqRequests = await db
    //   .collection("faqs")
    //   .find({
    //     therapist_id: new ObjectId(therapist._id),
    //   })
    //   .count();

    return res.status(200).json({
      message: "Dashboard data retrieved successfully.",
      data: {
        totalClients,
        groupSessionsConducted,
        liveChats,
        todaysAppointments,
        todaysPreConsultations,
        referralsGiven,
        referralsReceived,
        faqRequests,
      },
    });
  } catch (error) {
    console.error("Error retrieving dashboard data:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const uploadImage = async (req, res) => {
  try {
    const result = await generateSignedUrl();
    console.log("res", result);
    return res.status(200).json({
      message: "Get URL successfully.",
      data: result,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const registration = async (req, res) => {
  try {
    // Ensure that req.body is parsed correctly
    const data = req.body;
    console.log("called>>", data);

    // Validate input data (optional, but recommended)
    if (!data.email || !data.fullName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (email and fullName)",
      });
    }

    const db = getDb();
    const collection = db.collection("genricRegistration");

    // Insert the data into the collection
    const result = await collection.insertOne(data);

    // Check the result and respond accordingly
    if (result.acknowledged) {
      console.log("Data successfully added");
      return res.status(200).json({
        success: true,
        message: "Data successfully added",
      });
    } else {
      console.log("Failed in adding data");
      return res.status(500).json({
        success: false,
        message: "Failed in adding data",
      });
    }
  } catch (error) {
    console.error("Error during saving details:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const addWalletAmount = async (req, res) => {
  try {

    const userDetails = req.user;
    const { amount, order_id, payment_id } = req.body;

    // Ensure amount is a valid number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount.", error: true });
    }

    const userObjectId = new ObjectId(userDetails?._id);

    // Get the database reference
    const db = getDb();
    const userCollection = db.collection("users");

    // Find the user by ID
    const user = await userCollection.findOne({ _id: userObjectId });
    if (!user) {
      return res.status(404).json({ message: "User not found.", error: true });
    }

    // Calculate the new wallet amount
    const newWalletAmount = parseFloat(user.wallet_amount || 0) + parsedAmount;

    const currentTimeIST = new Date().toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata', // Set timezone to IST
      hour12: false,            // Use 24-hour format
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const result = await userCollection.updateOne(
      { _id: userObjectId },
      {
        $set: {
          wallet_amount: newWalletAmount
        },
      }
    );

    const paymentHistory = {
      order_id: order_id || generateWalletId(),
      payment_id: payment_id || generateWalletId(),
      user_id: userObjectId,
      amount: parsedAmount,
      name: user.name,
      drcr: "Credit",
      date: new Date(),
      time: currentTimeIST,
      type:"wallet"
    }

    const paymentCollection = db.collection("payments");
    await paymentCollection.insertOne(paymentHistory);

    // Check if the update was successful
    if (result.modifiedCount === 0) {
      return res.status(500).json({
        message: "Failed to update wallet and payment history.",
        error: true,
      });
    }

    // Return success response
    return res.status(200).json({
      message: "Wallet amount added and payment history updated successfully.",
      wallet_amount: newWalletAmount,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getWalletDetails = async (req, res) => {
  try {
    const userDetails = req.user;

    if (!userDetails) {
      return res.status(400).json({
        message: "User is not present",
        error: true,
      });
    }

    const db = getDb();
    const collection = db.collection("users");
    const paymentCollection = db.collection("payments");

    // Fetch wallet amount and payment history for the user
    const user = await collection.findOne(
      { _id: new ObjectId(userDetails._id) },
      { projection: { wallet_amount: 1 } }
    );

    const paymentDetails = await paymentCollection.find(
      { user_id: new ObjectId(userDetails._id) }
    ).toArray();

    if (!user || !paymentDetails) {
      return res.status(404).json({
        message: "User not found or payment details not found",
        error: true,
      });
    }

    const { wallet_amount = 0 } = user;

    return res.status(200).json({
      message: "Wallet details retrieved successfully",
      wallet_amount,
      paymentDetails
    });
  } catch (error) {
    console.error("Error retrieving wallet details:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

module.exports = {
  getSpeciality,
  getStateList,
  getConcern,
  generateOTPs,
  sendMeetLink,
  getProfileDetail,
  getDashboardCounter,
  sendOtpWithSms,
  sendOtpWithEmail,
  validateOTP,
  uploadImage,
  registration,
  addWalletAmount,
  getWalletDetails
};
