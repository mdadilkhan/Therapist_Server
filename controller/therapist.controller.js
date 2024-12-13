const { ObjectId } = require("mongodb");
const { getDb } = require("../db/db");

const getTherapistList = async (req, res) => {
  try {
    const db = getDb();
    const userCollection = db.collection("users");

    // Get the therapist ID from the logged-in user
    const therapistDetails = req.user;

    // Query to find all therapists except the currently logged-in one
    const therapists = await userCollection
      .find({
        role: "therapist",
        isActive: true,
        _id: { $ne: new ObjectId(therapistDetails._id) }, // Exclude the logged-in therapist
      })
      .project({ password: 0 }) // Exclude the password field from the result
      .toArray();

    if (!therapists || therapists.length === 0) {
      return res.status(404).json({
        message: "No therapists found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Therapists retrieved successfully.",
      data: therapists,
    });
  } catch (error) {
    console.log("Error retrieving therapists:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getTherapistDetail = async (req, res) => {
  try {
    const db = getDb();
    const userCollection = db.collection("users");

    const { therapistId } = req.params;

    if (!ObjectId.isValid(therapistId)) {
      return res.status(400).json({
        message: "Invalid therapist ID.",
        error: true,
      });
    }

    // Query to find the therapist by Object ID, excluding the password field
    const therapist = await userCollection.findOne(
      { _id: new ObjectId(therapistId), isActive: true, role: "therapist" },
      { projection: { password: 0 } }
    );

    if (!therapist) {
      return res.status(404).json({
        message: "Therapist not found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Therapist details retrieved successfully.",
      data: therapist,
    });
  } catch (error) {
    console.log("Error retrieving therapist details:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getTherapistSessionSlots = async (req, res) => {
  try {
    const db = getDb();
    const therapistDetails = req.user;
    const userCollection = db.collection("users");
    // Query to find the therapist by Object ID, excluding the password field
    const therapist = await userCollection.findOne(
      {
        _id: new ObjectId(therapistDetails._id),
        isActive: true,
        role: "therapist",
      },
      { projection: { slots: 1 } }
    );

    if (!therapist) {
      return res.status(404).json({
        message: "Therapist not found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Therapist Slots retrieved successfully.",
      data: therapist,
    });
  } catch (error) {
    console.log("Error retrieving therapist Slots:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getTherapistPreconsultationSlots = async (req, res) => {
  try {
    const db = getDb();
    const therapistDetails = req.user;

    const userCollection = db.collection("users");
    // Query to find the therapist by Object ID, excluding the password field
    const therapist = await userCollection.findOne(
      {
        _id: new ObjectId(therapistDetails._id),
        isActive: true,
        role: "therapist",
      },
      { projection: { preconsultation_slots: 1 } }
    );

    if (!therapist) {
      return res.status(404).json({
        message: "Therapist not found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Therapist Slots retrieved successfully.",
      data: therapist,
    });
  } catch (error) {
    console.log("Error retrieving therapist Slots:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const updateTherapistDetail = async (req, res) => {
  try {
    const db = getDb();
    const userCollection = db.collection("users");

    const therapist = req.user;
    const {
      name,
      phoneNumber,
      email,
      dob,
      gender,
      educationQualification,
      designation,
      specialization,
      experience,
      concerns,
      biography,
      organiztion,
      languages,
      address,
      city,
      state,
      expertise,
      googleMeetLink,
      accountHolderName,
      accountNumber,
      bankName,
      branchAddress,
      ifscCode,
    } = req.body;

    // Required fields check
    const requiredFields = [
      "name",
      "phoneNumber",
      "email",
      "dob",
      "gender",
      "educationQualification",
      "designation",
      "specialization",
      "experience",
      "concerns",
      "biography",
      "organiztion",
      "languages",
      "address",
      "city",
      "state",
      "expertise",
      "googleMeetLink",
      "accountHolderName",
      "accountNumber",
      "bankName",
      "branchAddress",
      "ifscCode",
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

    if (!ObjectId.isValid(therapist._id)) {
      return res.status(400).json({
        message: "Invalid therapist ID.",
        error: true,
      });
    }

    const updateData = {
      name,
      email,
      phone_number: phoneNumber,
      "profile_details.gender": gender,
      "educational_qualification.degrees": educationQualification,
      "profile_details.designation": designation,
      "profile_details.specialization": specialization,
      "profile_details.experience": experience,
      "profile_details.languages": languages,
      "profile_details.address": address,
      "profile_details.city": city,
      "profile_details.state": state,
      "profile_details.dob": dob,
      "profile_details.biography": biography,
      expertise,
      concerns,
      organization: organiztion,
      "profile_details.google_meet_link": googleMeetLink,
      "bank_details.account_holder_name": accountHolderName,
      "bank_details.account_number": accountNumber,
      "bank_details.bank_name": bankName,
      "bank_details.branch_address": branchAddress,
      "bank_details.ifsc_code": ifscCode,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    // Perform the update operation
    const result = await userCollection.updateOne(
      { _id: new ObjectId(therapist._id), role: "therapist" },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Therapist not found or update data is invalid.",
        error: true,
      });
    }

    // Fetch the updated therapist details
    const updatedTherapist = await userCollection.findOne(
      { _id: new ObjectId(therapist._id), role: "therapist" },
      { projection: { password: 0 } }
    );

    return res.status(200).json({
      message: "Therapist details updated successfully.",
      data: updatedTherapist,
    });
  } catch (error) {
    console.log("Error updating therapist details:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getMonthlyAppointmentData = async (req, res) => {
  try {
    const db = getDb();
    const appointmentCollection = db.collection("appointments");

    const therapistId = req.user._id;

    // Aggregating appointments by month and type
    const aggregationPipeline = [
      {
        // Step 1: Add a new field to extract the month and year from the booking_date
        $addFields: {
          bookingMonth: { $month: "$booking_date" },
          bookingYear: { $year: "$booking_date" },
        },
      },
      {
        // Step 2: Match only appointments for the current year
        $match: {
          bookingYear: new Date().getFullYear(),
          therapist_id: therapistId, // Ensure the therapist's appointments are matched
        },
      },
      {
        // Step 3: Group by the month and appointment type
        $group: {
          _id: {
            month: "$bookingMonth",
            type: "$type", // Either "preconsultation" or "session"
          },
          count: { $sum: 1 },
        },
      },
      {
        // Step 4: Project the result to make it more readable
        $project: {
          _id: 0,
          month: "$_id.month",
          type: "$_id.type",
          count: 1,
        },
      },
      {
        // Sort by month
        $sort: { month: 1 },
      },
    ];

    // Execute aggregation pipeline on the appointments collection
    const appointmentData = await db
      .collection("appointments")
      .aggregate(aggregationPipeline)
      .toArray();

    // Initialize monthly data structure
    const monthlyData = [
      { month: "Jan", appointment: 0, preconsultation: 0 },
      { month: "Feb", appointment: 0, preconsultation: 0 },
      { month: "Mar", appointment: 0, preconsultation: 0 },
      { month: "Apr", appointment: 0, preconsultation: 0 },
      { month: "May", appointment: 0, preconsultation: 0 },
      { month: "Jun", appointment: 0, preconsultation: 0 },
      { month: "Jul", appointment: 0, preconsultation: 0 },
      { month: "Aug", appointment: 0, preconsultation: 0 },
      { month: "Sep", appointment: 0, preconsultation: 0 },
      { month: "Oct", appointment: 0, preconsultation: 0 },
      { month: "Nov", appointment: 0, preconsultation: 0 },
      { month: "Dec", appointment: 0, preconsultation: 0 },
    ];

    // Populate the response with the aggregated data
    appointmentData.forEach(({ month, type, count }) => {
      const index = month - 1;
      if (type === "session") {
        monthlyData[index].appointment = count;
      } else if (type === "preconsultation") {
        monthlyData[index].preconsultation = count;
      }
    });

    return res.status(200).json({
      message: "Monthly appointment data retrieved successfully",
      data: monthlyData,
    });
  } catch (error) {
    console.error("Error retrieving monthly appointment data:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getEarningsAndCounts = async (req, res) => {
  try {
    const db = getDb();
    const appointmentsCollection = db.collection("appointments");
    const paymentsCollection = db.collection("payments"); // New payments collection
    const usersCollection = db.collection("users");
    const therapistId = req.user._id;

    const { startDate, endDate } = req.body;

    if (!therapistId) {
      return res.status(400).json({
        message: "Therapist ID is missing",
        error: true,
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "Start date and end date are required",
        error: true,
      });
    }

    // Convert dates to ISO format if they're not already
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Ensure endDate is inclusive
    end.setHours(23, 59, 59, 999);

    // Fetch therapist's receivedAmount and dueAmount from users collection
    const therapist = await usersCollection.findOne(
      { _id: new ObjectId(therapistId) },
      { projection: { receivedAmount: 1, dueAmount: 1 } }
    );

    if (!therapist) {
      return res.status(404).json({
        message: "Therapist not found",
        error: true,
      });
    }

    const { receivedAmount, dueAmount } = therapist;

    // Fetch total earnings from payments collection (simple query)
    const payments = await paymentsCollection
      .find({
        therapist_id: therapistId,
        date: { $gte: start, $lte: end }, // Filter by date range
      })
      .toArray();

    const totalEarnings = payments.reduce((sum, payment) => sum + payment.amount, 0);

    // Fetch all appointments for this therapist and date range
    const appointments = await appointmentsCollection
      .find({
        therapist_id: therapistId,
        booking_date: { $gte: start, $lte: end }, // Filter by date range
      })
      .toArray();

    // Calculate the counts manually
    let appointmentsCount = 0;
    let preconsultationsCount = 0;
    let liveChatCount = 0;

    appointments.forEach((appointment) => {
      if (appointment.type === "session") {
        appointmentsCount++;
      } else if (appointment.type === "preconsultation") {
        preconsultationsCount++;
      } else if (appointment.type === "live_chat") {
        liveChatCount++;
      }
    });

    return res.status(200).json({
      totalEarnings,
      receivedAmount: receivedAmount || 0,
      dueAmount: dueAmount || 0,
      appointmentsCount,
      preconsultationsCount,
      liveChatCount,
    });
  } catch (error) {
    console.log("Error fetching earnings and counts:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getAppointmentEarningsByType = async (req, res) => {
  try {
    const db = getDb();
    const paymentsCollection = db.collection("payments");
    const therapistId = req.user._id;

    if (!therapistId) {
      return res.status(400).json({
        message: "Therapist ID is missing",
        error: true,
      });
    }

    const currentYear = new Date().getFullYear();
    const startOfYearString = new Date(`${currentYear}-01-01T00:00:00.000Z`);
    const endOfYearString = new Date(`${currentYear}-12-31T23:59:59.999Z`);

    // Fetch all payments for this therapist within the current year
    const payments = await paymentsCollection
      .find({
        therapist_id: therapistId,
        date: { $gte: startOfYearString, $lte: endOfYearString },
      })
      .toArray();

    // Initialize earnings counters for each type
    let totalAppointmentEarning = 0;
    let totalPreConsultationEarning = 0;
    let totalGroupSessionsEarning = 0;
    let totalLiveChatEarning = 0;

    // Iterate over payments and sum up the amounts based on the type
    payments.forEach((payment) => {
      switch (payment.type) {
        case "post":
          totalAppointmentEarning += payment.amount;
          break;
        case "pre":
          totalPreConsultationEarning += payment.amount;
          break;
        case "group":
          totalGroupSessionsEarning += payment.amount;
          break;
        case "live":
          totalLiveChatEarning += payment.amount;
          break;
        default:
          break;
      }
    });

    return res.status(200).json({
      year: currentYear,
      totalAppointmentEarning,
      totalPreConsultationEarning,
      totalGroupSessionsEarning,
      totalLiveChatEarning,
    });
  } catch (error) {
    console.log("Error fetching earnings by type:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getAppoitnmentEarningpermonth = async (req, res) => {
  try {
    const db = getDb();
    const therapistId = req.user._id;

    if (!therapistId) {
      return res.status(400).json({
        message: "Therapist ID is missing",
        error: true,
      });
    }

    const Payments = db.collection("payments");

    // Fetch total appointment count for the therapist
    const totalAppointment = await db
      .collection("appointments")
      .countDocuments({ therapist_id: therapistId });

    const aggregationPipeline = [
      {
        // Step 1: Add a new field to extract the month and year from the booking_date
        $addFields: {
          bookingMonth: { $month: "$booking_date" },
          bookingYear: { $year: "$booking_date" },
        },
      },
      {
        // Step 2: Match only appointments for the current year
        $match: {
          bookingYear: new Date().getFullYear(),
          therapist_id: therapistId, // Ensure the therapist's appointments are matched
        },
      },
      {
        // Step 3: Group by the month and appointment type
        $group: {
          _id: {
            month: "$bookingMonth",
            type: "$type", // Either "preconsultation" or "session"
          },
          count: { $sum: 1 },
        },
      },
      {
        // Step 4: Project the result to make it more readable
        $project: {
          _id: 0,
          month: "$_id.month",
          type: "$_id.type",
          count: 1,
        },
      },
      {
        // Sort by month
        $sort: { month: 1 },
      },
    ];

    // Execute aggregation pipeline on the appointments collection
    const appointmentData = await db
      .collection("appointments")
      .aggregate(aggregationPipeline)
      .toArray();

    // Initialize monthly data structure
    const monthlyData = [
      { month: "Jan", appointment: 0, preconsultation: 0 },
      { month: "Feb", appointment: 0, preconsultation: 0 },
      { month: "Mar", appointment: 0, preconsultation: 0 },
      { month: "Apr", appointment: 0, preconsultation: 0 },
      { month: "May", appointment: 0, preconsultation: 0 },
      { month: "Jun", appointment: 0, preconsultation: 0 },
      { month: "Jul", appointment: 0, preconsultation: 0 },
      { month: "Aug", appointment: 0, preconsultation: 0 },
      { month: "Sep", appointment: 0, preconsultation: 0 },
      { month: "Oct", appointment: 0, preconsultation: 0 },
      { month: "Nov", appointment: 0, preconsultation: 0 },
      { month: "Dec", appointment: 0, preconsultation: 0 },
    ];

    // Populate the response with the aggregated data
    appointmentData.forEach(({ month, type, count }) => {
      const index = month - 1;
      if (type === "session") {
        monthlyData[index].appointment = count;
      } else if (type === "preconsultation") {
        monthlyData[index].preconsultation = count;
      }
    });

    // Filter payments only for the current year
    const currentYear = new Date().getFullYear();
    let overallTotalEarning = 0;
    const payments = await Payments.find({
      therapist_id: therapistId,
      type: { $in: ["pre", "post"] },
      date: {
        $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
        $lt: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`),
      },
    }).toArray();

    // Calculate total earnings for the current year
    payments.forEach((payment) => {
      overallTotalEarning += payment.amount;
    });

    res.status(200).json({
      monthlyData,
      overallTotalEarning,
      totalAppointment,
    });
  } catch (error) {
    console.error("Error in getAppoitnmentEaringpermonth:", error);
    return res.status(500).json({
      message: "Error fetching payments",
      error: true,
    });
  }
};

module.exports = {
  getTherapistList,
  getTherapistDetail,
  updateTherapistDetail,
  getTherapistSessionSlots,
  getTherapistPreconsultationSlots,
  getMonthlyAppointmentData,
  getEarningsAndCounts,
  getAppointmentEarningsByType,
  getAppoitnmentEarningpermonth,
};
