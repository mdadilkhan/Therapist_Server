const { ObjectId } = require("mongodb");
const { getDb } = require("../db/db");
const moment = require("moment");
const { generateWalletId } = require("../helpers/getConversation");

const getPreconsultationSlots = async (req, res) => {
  try {
    const db = getDb();
    const { date } = req.body;

    if (!date) {
      return apiResponseBody(
        400,
        false,
        "Date is missing from the request body."
      );
    }

    const inputDate = new Date(date);
    const day = inputDate.getUTCDay();

    if (isNaN(day)) {
      return res.status(400).json({
        message: "Invalid date.",
        error: true,
      });
    }

    const collection = db.collection("admin");
    const therapist = await collection.findOne({role: "admin" });

    if (!therapist) {
      return res.status(400).json({
        message: "Therapist not found or inactive.",
        error: true,
      });
    }

    // Fetch normal slots for the specified day
    const daySlots = therapist.slots
      ? therapist.slots.find((d) => d.day === day)
      : null;

    // Fetch preconsultation slots for the specified day
    const preconsultationDaySlots = therapist.preconsultation_slots
      ? therapist.preconsultation_slots.find((d) => d.day === day)
      : null;

    // If no normal slots are found for the day
    if (!daySlots && !preconsultationDaySlots) {
      return res.status(404).json({
        message: "No slots found for the specified day.",
        error: true,
      });
    }

    // If preconsultation slots exist, we can handle them as needed (e.g., exclude them, flag them)
    let allSlots = daySlots ? daySlots.slots : [];
    if (preconsultationDaySlots) {
      preconsultationDaySlots.slots.forEach((preSlot) => {
        allSlots.forEach((slot) => {
          if (doSlotsOverlap(slot, preSlot)) {
            slot.m_preconsultation_status = 1; // Flagging overlapping preconsultation slots
          }
        });
      });
    }
    // Independent check for past slots
    const currentTimeUTC = new Date();
    const ISTOffset = 5.5 * 60 * 60 * 1000; // IST is UTC + 5:30
    const currentISTTime = new Date(currentTimeUTC.getTime() + ISTOffset);
    const currentISTTimeISO = currentISTTime.toISOString().split('.')[0] + '+05:30';
    // Function to format time in IST manually
    const formatToIST = (inputDate, timeString) => {
      const [hours, minutes, seconds] = timeString.split(':');
      const dateObj = new Date(inputDate);
      // Manually set hours, minutes, and seconds
      dateObj.setHours(hours);
      dateObj.setMinutes(minutes);
      dateObj.setSeconds(seconds || 0); // If seconds are not provided, default to 0
      // Adjust for IST (UTC + 05:30)
      const ISTOffset = 5.5 * 60 * 60 * 1000;
      const dateIST = new Date(dateObj.getTime());
      // Convert to ISO format and replace 'Z' with '+05:30'
      return dateIST.toISOString().split('.')[0] + '+05:30';
    };
    allSlots.forEach((slot) => {
      const slotTimeISO = formatToIST(inputDate, slot.m_schd_from);
      console.log("kaif", slotTimeISO , currentISTTimeISO , inputDate , currentTimeUTC);
      if (slotTimeISO < currentISTTimeISO && inputDate < currentTimeUTC) {
        slot.m_booked_status = 2; // Mark slots in the past with status 2
      }
    });

    // Check for existing bookings on the given date
    const bookings = therapist.pre_booking_slots
      ? therapist.pre_booking_slots.filter(
          (b) =>
            new Date(b.booking_date).toDateString() === inputDate.toDateString()
        )
      : [];
    if (bookings.length > 0) {
      // Update the booked status for the slots
      allSlots.forEach((slot) => {
        bookings.forEach((booking) => {
          const bookedSlot = booking.booking_slots.find(
            (b) =>
              b.m_schd_from === slot.m_schd_from &&
              b.m_schd_to === slot.m_schd_to
          );
          if (bookedSlot) {
            slot.m_booked_status = 1;
          }
        });
      });
    }

    return res.status(200).json({
      message: "Slots retrieved successfully.",
      data: {
        date: inputDate.toDateString(),
        day: day,
        slots: allSlots,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error,
    });
  }
};

const getSelfTherapySlots = async (req, res) => {
  try {
    const db = getDb();
    const { date } = req.body;

    if (!date) {
      return apiResponseBody(
        400,
        false,
        "Date is missing from the request body."
      );
    }

    const inputDate = new Date(date);
    const day = inputDate.getUTCDay();

    if (isNaN(day)) {
      return res.status(400).json({
        message: "Invalid date.",
        error: true,
      });
    }

    const collection = db.collection("admin");
    const therapist = await collection.findOne({role: "admin" });

    if (!therapist) {
      return res.status(400).json({
        message: "Therapist not found or inactive.",
        error: true,
      });
    }

    // Fetch normal slots for the specified day
    const daySlots = therapist.slots
      ? therapist.slots.find((d) => d.day === day)
      : null;

    // Fetch preconsultation slots for the specified day
    const preconsultationDaySlots = therapist.preconsultation_slots
      ? therapist.preconsultation_slots.find((d) => d.day === day)
      : null;

    // If no normal slots are found for the day
    if (!daySlots && !preconsultationDaySlots) {
      return res.status(404).json({
        message: "No slots found for the specified day.",
        error: true,
      });
    }

    // If preconsultation slots exist, we can handle them as needed (e.g., exclude them, flag them)
    let allSlots = daySlots ? daySlots.slots : [];
    if (preconsultationDaySlots) {
      preconsultationDaySlots.slots.forEach((preSlot) => {
        allSlots.forEach((slot) => {
          if (doSlotsOverlap(slot, preSlot)) {
            slot.m_preconsultation_status = 1; // Flagging overlapping preconsultation slots
          }
        });
      });
    }

    const currentTimeUTC = new Date();
    const ISTOffset = 5.5 * 60 * 60 * 1000; // IST is UTC + 5:30
    const currentISTTime = new Date(currentTimeUTC.getTime() + ISTOffset);
    const currentISTTimeISO = currentISTTime.toISOString().split('.')[0] + '+05:30';
    // Function to format time in IST manually
    const formatToIST = (inputDate, timeString) => {
      const [hours, minutes, seconds] = timeString.split(':');
      const dateObj = new Date(inputDate);
      // Manually set hours, minutes, and seconds
      dateObj.setHours(hours);
      dateObj.setMinutes(minutes);
      dateObj.setSeconds(seconds || 0); // If seconds are not provided, default to 0
      // Adjust for IST (UTC + 05:30)
      const ISTOffset = 5.5 * 60 * 60 * 1000;
      const dateIST = new Date(dateObj.getTime());
      // Convert to ISO format and replace 'Z' with '+05:30'
      return dateIST.toISOString().split('.')[0] + '+05:30';
    };
    allSlots.forEach((slot) => {
      const slotTimeISO = formatToIST(inputDate, slot.m_schd_from);
      console.log("kaif", slotTimeISO , currentISTTimeISO , inputDate , currentTimeUTC);
      if (slotTimeISO < currentISTTimeISO && inputDate < currentTimeUTC) {
        slot.m_booked_status = 2; // Mark slots in the past with status 2
      }
    });

    // Check for existing bookings on the given date
    const bookings = therapist.self_therapy_booking_slots
      ? therapist.self_therapy_booking_slots.filter(
          (b) =>
            new Date(b.booking_date).toDateString() === inputDate.toDateString()
        )
      : [];

    if (bookings.length > 0) {
      // Update the booked status for the slots
      allSlots.forEach((slot) => {
        bookings.forEach((booking) => {
          const bookedSlot = booking.booking_slots.find(
            (b) =>
              b.m_schd_from === slot.m_schd_from &&
              b.m_schd_to === slot.m_schd_to
          );
          if (bookedSlot) {
            slot.m_booked_status = 1;
          }
        });
      });
    }

    return res.status(200).json({
      message: "Slots retrieved successfully.",
      data: {
        date: inputDate.toDateString(),
        day: day,
        slots: allSlots,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error,
    });
  }
};

const generateSlots = async (req, res) => {
  try {
    const { day, start_time, end_time } = req.body;
    const db = getDb();
    const therapistCollection = db.collection("admin");
    const therapist = await therapistCollection.findOne({ role: "admin" });

    if (typeof day !== "number" || day < 0 || day > 6) {
      return res.status(400).json({
        message:
          "Invalid day. Provide a number between 0 (Sunday) and 6 (Saturday).",
        error: true,
      });
    }

    if (!start_time || !end_time) {
      return res.status(400).json({
        message: "Start time and end time are required.",
        error: true,
      });
    }

    const startTime = moment(start_time, "HH:mm:ss", true);
    const endTime = moment(end_time, "HH:mm:ss", true);

    if (!startTime.isValid() || !endTime.isValid()) {
      return res.status(400).json({
        message: "Invalid time format. Use HH:mm:ss format.",
        error: true,
      });
    }

    if (startTime.isAfter(endTime)) {
      return res.status(400).json({
        message: "Start time must be before end time.",
        error: true,
      });
    }

    const newSlots = generateTimeSlots(startTime, endTime);

    if (!therapist) {
      return res.status(404).json({
        message: "Therapist not found or inactive.",
        error: true,
      });
    }

    // Initialize slots if they don't exist
    therapist.slots = therapist.slots || [];

    // Check for existing slots for the specific day
    let existingDaySlots = therapist.slots.find((d) => d.day === day);

    if (existingDaySlots) {
      for (const newSlot of newSlots) {
        for (const existingSlot of existingDaySlots.slots) {
          if (doSlotsOverlap(newSlot, existingSlot)) {
            return res.status(400).json({
              message: "Time range overlaps with existing normal slots.",
              error: true,
            });
          }
        }
      }
    }

    // If no existing slots for the day, create an empty slot array
    if (!existingDaySlots) {
      existingDaySlots = { day: day, slots: [] };
      therapist.slots.push(existingDaySlots);
    }

    // Add new slots
    existingDaySlots.slots.push(...newSlots);

    const updateResult = await therapistCollection.updateOne(
      { role: "admin" },
      { $set: { slots: therapist.slots } }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        message: "Failed to update the slots.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Slots generated successfully.",
      data: { day: day, slots: newSlots },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const bookPreconsultationAppointment = async (req, res) => {
  try {
    const userDetails = req.user;

    const db = getDb();

    const collection = db.collection("users");
    const adminCollection = db.collection("admin")

    if (!userDetails) {
      return res.status(400).json({
        message: "User is not present",
        error: true,
      });
    }

    const {
      bookingDate,
      bookingSlots,
      paymentMode,
      amount,
      paymentId,
      orderId,
    } = req.body;

    if (!bookingDate || !bookingSlots || !paymentMode || amount <= 0) {
      return res.status(400).json({
        message:
          "bookingDate, slots, paymentMode, and amount are required.",
        error: true,
      });
    }
    const parsedAmount = parseFloat(amount);
    const validDate = moment(bookingDate, "YYYY-MM-DD", true).isValid();

    if (!validDate) {
      return res.status(400).json({
        message: "Invalid Date Format",
        error: true,
      });
    }

    if (!Array.isArray(bookingSlots) || bookingSlots.length === 0) {
      return res.status(400).json({
        message: "Slots must be a non-empty array.",
        error: true,
      });
    }

    const employee = await collection.findOne({
      _id: new ObjectId(userDetails._id),
    });

    if (!employee) {
      return res.status(400).json({
        message: "Specified employee not found or inactive.",
        error: true,
      });
    }

    // Handle wallet payment
    if (paymentMode === "wallet") {
      const walletAmount = parseFloat(employee.wallet_amount) || 0;

      if (walletAmount < parsedAmount) {
        return res.status(400).json({
          message: "Insufficient wallet balance.",
          error: true,
        });
      }

      const newWalletAmount = parseFloat(employee.wallet_amount || 0) - parsedAmount;
      // Deduct the amount from wallet
      await collection.updateOne(
        { _id: new ObjectId(userDetails._id) },
        {
          $set: { wallet_amount: newWalletAmount },
        }
      );
    }

    // Prepare appointment data
    const appointment = {
      booking_date: new Date(bookingDate),
      booking_duration: 30,
      booking_slots: bookingSlots,
      booking_type: "video",
      user_id: userDetails._id,
      booking_status: 1,
      created_at: moment().toISOString(),
      payment_mode: paymentMode,
      payment_status: 1, // Set payment_status as 1 for wallet payment
      amount: parsedAmount,
      payment_id: paymentId || generateWalletId(), // Optional for wallet payment
      order_id: orderId || generateWalletId(), // Optional for wallet payment
      type: "preconsultation",
    };

    const appointmentCollection = db.collection("appointments");

    // Insert the appointment
    const result = await appointmentCollection.insertOne(appointment);
    const appointmentId = result.insertedId.toString();
    const currentTimeIST = new Date().toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata', // Set timezone to IST
      hour12: false,            // Use 24-hour format
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const paymentHistory = {
      order_id: orderId || generateWalletId(),
      payment_id: paymentId || generateWalletId(),
      amount: parsedAmount,
      appointment_id: appointmentId,
      user_id: new ObjectId(userDetails._id),
      name: employee.name,
      drcr: "Debit",
      date: new Date(),
      time: currentTimeIST,
      type:"pre"
    }

    const paymentCollection = db.collection("payments");
    await paymentCollection.insertOne(paymentHistory);

    const updateResult = await adminCollection.updateOne(
      { role: "admin" },
      { $addToSet: { pre_booking_slots: { booking_date: new Date(bookingDate), booking_slots: bookingSlots } } }
    );

    if (updateResult.matchedCount === 0) {
      console.log("New user record created");
    } else {
      console.log("User payment details updated");
    }

    return res.status(200).json({
      message: "Appointment booked successfully.",
    });
  } catch (error) {
    console.log("Error booking appointment:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const reschedulePreconsultationAppointment = async (req, res) => {
  try {
    const db = getDb();

    const { appointmentId, newDate, newSlots, therapistId } = req.body;

    if (!appointmentId || !newDate || !newSlots || !therapistId) {
      return res.status(400).json({
        message: "bookingDate, slots, appointment, therapistId are required.",
        error: true,
      });
    }

    if (!ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        message: "Invalid AppointmentId",
        error: true,
      });
    }

    const validDate = moment(newDate, "YYYY-MM-DD", true).isValid();
    if (!validDate) {
      return res.status(400).json({
        message: "Invalid Date Format",
        error: true,
      });
    }

    if (!Array.isArray(newSlots) || newSlots.length === 0) {
      return res.status(400).json({
        message: "Slots must be a non-empty array.",
        error: true,
      });
    }

    const employeeCollection = db.collection("users");
    const appointmentsCollection = db.collection("appointments");

    // Find the appointment
    const appointment = await appointmentsCollection.findOne({
      _id: new ObjectId(appointmentId),
    });

    if (!appointment) {
      return res.status(400).json({
        message:
          "Appointment not found or you are not authorized to reschedule this appointment.",
        error: true,
      });
    }

    // Update the appointment with new details
    const updateResult = await appointmentsCollection.updateOne(
      { _id: new ObjectId(appointmentId) },
      {
        $set: {
          booking_date: new Date(newDate),
          booking_slots: newSlots,
          updated_at: moment().toISOString(),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(400).json({
        message: "Appointment not found or update failed.",
        error: true,
      });
    }

    // Find the employee by emp_id
    const employee = await employeeCollection.findOne({
      _id: new ObjectId(therapistId),
      isActive: true,
    });

    if (!employee) {
      return res.status(400).json({
        message: "Employee not found.",
        error: true,
      });
    }

    // Format date function
    const formatDate = (date) => {
      const d = new Date(date);
      return d.toISOString().split("T")[0];
    };

    // Remove the previous booking slots
    const filteredBookingSlots = employee.booking_slots.filter((booking) => {
      const bookingDateMatch =
        formatDate(booking.booking_date) ===
        formatDate(appointment.booking_date);
      const slotsMatch = booking.booking_slots.every((slot) => {
        return appointment.booking_slots.some(
          (bSlot) =>
            bSlot.m_schd_from === slot.m_schd_from &&
            bSlot.m_schd_to === slot.m_schd_to
        );
      });
      return !(bookingDateMatch && slotsMatch);
    });

    // Add the new booking slots
    const newBookingSlot = {
      booking_date: new Date(newDate),
      booking_slots: newSlots,
    };

    const updatedBookingSlots = [...filteredBookingSlots, newBookingSlot];

    // Update the employee document
    const employeeUpdateResult = await employeeCollection.updateOne(
      { _id: new ObjectId(therapistId), isActive: true },
      { $set: { booking_slots: updatedBookingSlots } }
    );

    if (employeeUpdateResult.matchedCount === 0) {
      return res.status(400).json({
        message: "Employee not found or booking slots not updated.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Reschedule Appointment successfully",
      error: true,
    });
  } catch (error) {
    console.log("Error rescheduling appointment:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const cancelPreconsultationAppointment = async (req, res) => {
  try {
    const db = getDb();
    // Extract appointment ID, booking date, and slots from the request body
    const { app_id } = req.body;

    if (!app_id || !ObjectId.isValid(app_id)) {
      return res.status(400).json({
        message: "Invalid appointment ID.",
        error: true,
      });
    }

    const appointment_id = new ObjectId(app_id);

    const employeeCollection = db.collection("users");
    const appointmentCollection = db.collection("appointments");

    // Find the appointment
    const appointment = await appointmentCollection.findOne({
      _id: appointment_id,
    });

    if (!appointment) {
      return res.status(400).json({
        message: "Appointment not found.",
        error: true,
      });
    }

    // Update the booking status of the appointment
    const result = await appointmentCollection.updateOne(
      { _id: appointment_id, booking_status: { $ne: 2 } }, // Check if booking_status is not equal to 2
      { $set: { booking_status: 5 } }
    );    

    if (result.matchedCount === 0) {
      return res.status(400).json({
        message: "Appointment not found or already updated.",
        error: true,
      });
    }

    // Find the employee by emp_id
    const employee = await employeeCollection.findOne({
      _id: appointment?.therapist_id,
      role: "therapist",
      isActive: true,
    });

    if (!employee) {
      return res.status(400).json({
        message: "Employee not found.",
        error: true,
      });
    }

    const formatDate = (date) => {
      const d = new Date(date);
      return d.toISOString().split("T")[0];
    };

    const updatedBookingSlots = employee.booking_slots.filter((booking) => {
      const bookingDateMatch =
        formatDate(booking.booking_date) ===
        formatDate(appointment.booking_date);
      const slotsMatch = booking.booking_slots.every((slot) => {
        return appointment.booking_slots.some(
          (bSlot) =>
            bSlot.m_schd_from === slot.m_schd_from &&
            bSlot.m_schd_to === slot.m_schd_to
        );
      });

      return !(bookingDateMatch && slotsMatch);
    });

    if (updatedBookingSlots.length === employee.booking_slots.length) {
      return res.status(400).json({
        message: "No matching booking slot found.",
        error: true,
      });
    }

    // Update the employee document
    const updateResult = await employeeCollection.updateOne(
      {
        _id: appointment?.therapist_id,
        role: "therapist",
        isActive: true,
      },
      { $set: { booking_slots: updatedBookingSlots } }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(400).json({
        message: "No matching booking slot found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Booking status updated and slot deleted successfully.",
      error: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const bookAppointment = async (req, res) => {
  try {
    const userDetails = req.user;
    const db = getDb();
    const collection = db.collection("users");

    if (!userDetails) {
      return res.status(400).json({
        message: "User is not present",
        error: true,
      });
    }

    const {
      bookingDate,
      bookingSlots,
      duration,
      therapistId,
      bookingType,
      paymentMode,
      amount,
      orderId,
      paymentId,
    } = req.body;

    if (
      !bookingDate ||
      !bookingSlots ||
      !duration ||
      !bookingType ||
      !therapistId ||
      !paymentMode ||
      amount <= 0
    ) {
      return res.status(400).json({
        message:
          "bookingDate, slots, duration, therapistId, bookingType, paymentMode, and amount are required.",
        error: true,
      });
    }
    const parsedAmount = parseFloat(amount);
    const validDate = moment(bookingDate, "YYYY-MM-DD", true).isValid();
    if (!validDate) {
      return res.status(400).json({
        message: "Invalid Date Format",
        error: true,
      });
    }

    if (!Array.isArray(bookingSlots) || bookingSlots.length === 0) {
      return res.status(400).json({
        message: "Slots must be a non-empty array.",
        error: true,
      });
    }

    const employee = await collection.findOne({
      _id: new ObjectId(userDetails._id),
    });

    if (!employee) {
      return res.status(400).json({
        message: "Specified employee not found or inactive.",
        error: true,
      });
    }

    // Handle wallet payment
    if (paymentMode === "wallet") {
      const walletAmount = parseFloat(employee.wallet_amount) || 0;

      if (walletAmount < parsedAmount) {
        return res.status(400).json({
          message: "Insufficient wallet balance.",
          error: true,
        });
      }

      const newWalletAmount = parseFloat(employee.wallet_amount || 0) - parsedAmount;
      // Deduct the amount from wallet
      await collection.updateOne(
        { _id: new ObjectId(userDetails._id) },
        {
          $set: { wallet_amount: newWalletAmount },
        }
      );
    } else if (!paymentId || !orderId) {
      // If online payment, ensure paymentId and orderId are provided
      return res.status(400).json({
        message: "paymentId and orderId are required for online payments.",
        error: true,
      });
    }

    // Prepare appointment data
    const appointment = {
      therapist_id: new ObjectId(therapistId),
      booking_date: new Date(bookingDate),
      booking_duration: parseInt(duration),
      booking_slots: bookingSlots,
      booking_type: bookingType,
      user_id: userDetails._id,
      booking_status: 1,
      created_at: moment().toISOString(),
      payment_mode: paymentMode,
      payment_status: 1, // Set payment_status for wallet payments
      amount: parsedAmount,
      payment_id: paymentId || generateWalletId(), // Optional for wallet payment
      order_id: orderId || generateWalletId(), // Optional for wallet payment
      type: "session",
    };

    const appointmentCollection = db.collection("appointments");

    // Insert appointment
    const result = await appointmentCollection.insertOne(appointment);
    const appointmentId = result.insertedId.toString();
    const currentTimeIST = new Date().toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata', // Set timezone to IST
      hour12: false,            // Use 24-hour format
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const paymentHistory = {
      order_id: orderId || generateWalletId(),
      payment_id: paymentId || generateWalletId(),
      amount: parsedAmount,
      appointment_id: appointmentId,
      user_id: new ObjectId(userDetails._id),
      therapist_id : new ObjectId(therapistId), 
      name: employee.name,
      drcr: "Debit",
      date: new Date(),
      time: currentTimeIST,
      type:"post"
    }

    const paymentCollection = db.collection("payments");
    await paymentCollection.insertOne(paymentHistory);

    // Add booking slot to therapist's record
    const updateResult = await collection.updateOne(
      { _id: new ObjectId(therapistId) },
      { $addToSet: { booking_slots: { booking_date: new Date(bookingDate), booking_slots: bookingSlots } } }
    );

    if (updateResult.matchedCount === 0) {
      console.log("New user record created");
    } else {
      console.log("User payment details updated");
    }

    return res.status(200).json({
      message: "Appointment booked successfully.",
    });
  } catch (error) {
    console.log("Error updating booking slots and booking appointment:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const rescheduleAppointment = async (req, res) => {
  try {
    const db = getDb();

    const {
      appointmentId,
      newDate,
      newSlots,
      newDuration,
      therapistId,
    } = req.body;

    if (
      !appointmentId ||
      !newDate ||
      !newSlots ||
      !newDuration ||
      !therapistId
    ) {
      return res.status(400).json({
        message:
          "bookingDate, slots, duration, therapistId are required.",
        error: true,
      });
    }

    if (!ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        message: "Invalid AppointmentId",
        error: true,
      });
    }

    const validDate = moment(newDate, "YYYY-MM-DD", true).isValid();
    if (!validDate) {
      return res.status(400).json({
        message: "Invalid Date Format",
        error: true,
      });
    }

    if (!Array.isArray(newSlots) || newSlots.length === 0) {
      return res.status(400).json({
        message: "Slots must be a non-empty array.",
        error: true,
      });
    }

    const employeeCollection = db.collection("users");
    const appointmentsCollection = db.collection("appointments");

    // Find the appointment
    const appointment = await appointmentsCollection.findOne({
      _id: new ObjectId(appointmentId),
    });

    if (!appointment) {
      return res.status(400).json({
        message:
          "Appointment not found or you are not authorized to reschedule this appointment.",
        error: true,
      });
    }

    // Update the appointment with new details
    const updateResult = await appointmentsCollection.updateOne(
      { _id: new ObjectId(appointmentId) },
      {
        $set: {
          booking_date: new Date(newDate),
          booking_duration: parseInt(newDuration),
          booking_slots: newSlots,
          updated_at: moment().toISOString(),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(400).json({
        message: "Appointment not found or update failed.",
        error: true,
      });
    }

    // Find the employee by emp_id
    const employee = await employeeCollection.findOne({
      _id: new ObjectId(therapistId),
      isActive: true,
    });

    if (!employee) {
      return res.status(400).json({
        message: "Employee not found.",
        error: true,
      });
    }

    // Format date function
    const formatDate = (date) => {
      const d = new Date(date);
      return d.toISOString().split("T")[0];
    };

    // Remove the previous booking slots
    const filteredBookingSlots = employee.booking_slots.filter((booking) => {
      const bookingDateMatch =
        formatDate(booking.booking_date) ===
        formatDate(appointment.booking_date);
      const slotsMatch = booking.booking_slots.every((slot) => {
        return appointment.booking_slots.some(
          (bSlot) =>
            bSlot.m_schd_from === slot.m_schd_from &&
            bSlot.m_schd_to === slot.m_schd_to
        );
      });
      return !(bookingDateMatch && slotsMatch);
    });

    // Add the new booking slots
    const newBookingSlot = {
      booking_date: new Date(newDate),
      booking_slots: newSlots,
    };

    const updatedBookingSlots = [...filteredBookingSlots, newBookingSlot];

    // Update the employee document
    const employeeUpdateResult = await employeeCollection.updateOne(
      { _id: new ObjectId(therapistId), isActive: true },
      { $set: { booking_slots: updatedBookingSlots } }
    );

    if (employeeUpdateResult.matchedCount === 0) {
      return res.status(400).json({
        message: "Employee not found or booking slots not updated.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Reschedule Appointment successfully",
      error: true,
    });
  } catch (error) {
    console.log("Error rescheduling appointment:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const cancelAppointment = async (req, res) => {
  try {
    const db = getDb();
    // Extract appointment ID, booking date, and slots from the request body
    const { app_id } = req.body;

    if (!app_id || !ObjectId.isValid(app_id)) {
      return res.status(400).json({
        message: "Invalid appointment ID.",
        error: true,
      });
    }

    const appointment_id = new ObjectId(app_id);

    const employeeCollection = db.collection("users");
    const appointmentCollection = db.collection("appointments");

    // Find the appointment
    const appointment = await appointmentCollection.findOne({
      _id: appointment_id,
    });

    if (!appointment) {
      return res.status(400).json({
        message: "Appointment not found.",
        error: true,
      });
    }

    // Update the booking status of the appointment
    const result = await appointmentCollection.updateOne(
      { _id: appointment_id, booking_status: { $ne: 2 } }, // Check if booking_status is not equal to 2
      { $set: { booking_status: 5 } }
    );    

    if (result.matchedCount === 0) {
      return res.status(400).json({
        message: "Appointment not found or already updated.",
        error: true,
      });
    }

    // Find the employee by emp_id
    const employee = await employeeCollection.findOne({
      _id: appointment?.therapist_id,
      role: "therapist",
      isActive: true,
    });

    if (!employee) {
      return res.status(400).json({
        message: "Employee not found.",
        error: true,
      });
    }

    const formatDate = (date) => {
      const d = new Date(date);
      return d.toISOString().split("T")[0];
    };

    const updatedBookingSlots = employee.booking_slots.filter((booking) => {
      const bookingDateMatch =
        formatDate(booking.booking_date) ===
        formatDate(appointment.booking_date);
      const slotsMatch = booking.booking_slots.every((slot) => {
        return appointment.booking_slots.some(
          (bSlot) =>
            bSlot.m_schd_from === slot.m_schd_from &&
            bSlot.m_schd_to === slot.m_schd_to
        );
      });

      return !(bookingDateMatch && slotsMatch);
    });

    if (updatedBookingSlots.length === employee.booking_slots.length) {
      return res.status(400).json({
        message: "No matching booking slot found.",
        error: true,
      });
    }

    // Update the employee document
    const updateResult = await employeeCollection.updateOne(
      {
        _id: appointment?.therapist_id,
        role: "therapist",
        isActive: true,
      },
      { $set: { booking_slots: updatedBookingSlots } }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(400).json({
        message: "No matching booking slot found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Booking status updated and slot deleted successfully.",
      error: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getTherapistPreconsultationSlots = async (req, res) => {
  try {
    const db = getDb();
    const { therapistId, date } = req.body;
    if (!date) {
      return res.status(400).json({
        message: "Date is missing from the request body.",
        error: true,
      });
    }
    const inputDate = new Date(date);
    const day = inputDate.getUTCDay();
    if (isNaN(day)) {
      return res.status(400).json({
        message: "Invalid date.",
        error: true,
      });
    }
    const collection = db.collection("users");
    const therapist = await collection.findOne({
      _id: new ObjectId(therapistId),
    });
    if (!therapist) {
      return res.status(404).json({
        message: "Therapist not found.",
        error: true,
      });
    }
    // Fetch normal slots for the specified day
    const daySlots = therapist.slots
      ? therapist.slots.find((d) => d.day === day)
      : null;
    // Fetch preconsultation slots for the specified day
    const dayPreconsultationSlots = therapist.preconsultation_slots
      ? therapist.preconsultation_slots.find((d) => d.day === day)
      : null;
    if (!dayPreconsultationSlots) {
      return res.status(404).json({
        message: "No preconsultation slots found for the specified day.",
        error: true,
      });
    }
    // Convert current time to IST
    const currentTimeUTC = new Date();
    const ISTOffset = 5.5 * 60 * 60 * 1000; // IST is UTC + 05:30
    const currentISTTime = new Date(currentTimeUTC.getTime() + ISTOffset);
    const currentISTTimeISO =
      currentISTTime.toISOString().split(".")[0] + "+05:30";
    // Function to manually format slot times to IST
    const formatToIST = (inputDate, timeString) => {
      const [hours, minutes, seconds] = timeString.split(":");
      const dateObj = new Date(inputDate);
      // Manually set hours, minutes, and seconds
      dateObj.setHours(hours);
      dateObj.setMinutes(minutes);
      dateObj.setSeconds(seconds || 0); // If seconds are not provided, default to 0
      // Adjust for IST (UTC + 05:30)
      const ISTOffset = 5.5 * 60 * 60 * 1000;
      const dateIST = new Date(dateObj.getTime());
      // Convert to ISO format and replace 'Z' with '+05:30'
      return dateIST.toISOString().split(".")[0] + "+05:30";
    };
    // Check for overlapping slots between normal and preconsultation slots
    let allPreconsultationSlots = dayPreconsultationSlots.slots;
    if (daySlots) {
      allPreconsultationSlots.forEach((preSlot) => {
        daySlots.slots.forEach((normalSlot) => {
          if (doSlotsOverlap(normalSlot, preSlot)) {
            preSlot.m_normal_slot_overlap = 1; // Flag overlapping normal slots
          }
        });
      });
    }
    // Check for existing bookings on the given date
    const bookings = therapist.booking_slots
      ? therapist.booking_slots.filter(
          (b) =>
            new Date(b.booking_date).toDateString() === inputDate.toDateString()
        )
      : [];
    // Mark slots as booked and handle past slots
    allPreconsultationSlots.forEach((slot) => {
      const slotTimeISO = formatToIST(inputDate, slot.m_schd_from);
      // Mark as past if slot is before current time in IST
      if (slotTimeISO < currentISTTimeISO && inputDate < currentTimeUTC) {
        slot.m_booked_status = 2; // Mark slot as past (status 2)
      }
      // Check if this slot is booked
      bookings.forEach((booking) => {
        const bookedSlot = booking.booking_slots.find(
          (b) =>
            b.m_schd_from === slot.m_schd_from && b.m_schd_to === slot.m_schd_to
        );
        if (bookedSlot) {
          slot.m_booked_status = 1; // Mark slot as booked (status 1)
        }
      });
    });
    return res.status(200).json({
      message: "Preconsultation slots retrieved successfully.",
      data: {
        date: inputDate.toDateString(),
        day: day,
        slots: allPreconsultationSlots,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error,
    });
  }
};

const getTherapistSlots = async (req, res) => {
  try {
    const db = getDb();
    const { therapistId, date } = req.body;
    if (!date) {
      return apiResponseBody(
        400,
        false,
        "Date is missing from the request body."
      );
    }
    const inputDate = new Date(date);
    const day = inputDate.getUTCDay();
    if (isNaN(day)) {
      return res.status(400).json({
        message: "Invalid date.",
        error: true,
      });
    }
    const collection = db.collection("users");
    const therapist = await collection.findOne({
      _id: new ObjectId(therapistId),
    });
    if (!therapist) {
      return res.status(400).json({
        message: "Therapist not found or inactive.",
        error: true,
      });
    }
    // Fetch normal slots for the specified day
    const daySlots = therapist.slots
      ? therapist.slots.find((d) => d.day === day)
      : null;
    // Fetch preconsultation slots for the specified day
    const preconsultationDaySlots = therapist.preconsultation_slots
      ? therapist.preconsultation_slots.find((d) => d.day === day)
      : null;
    // If no normal slots are found for the day
    if (!daySlots && !preconsultationDaySlots) {
      return res.status(404).json({
        message: "No slots found for the specified day.",
        error: true,
      });
    }
    // If preconsultation slots exist, we can handle them as needed (e.g., exclude them, flag them)
    let allSlots = daySlots ? daySlots.slots : [];
    if (preconsultationDaySlots) {
      preconsultationDaySlots.slots.forEach((preSlot) => {
        allSlots.forEach((slot) => {
          if (doSlotsOverlap(slot, preSlot)) {
            slot.m_preconsultation_status = 1; // Flagging overlapping preconsultation slots
          }
        });
      });
    }
    // Independent check for past slots
    const currentTimeUTC = new Date();
    const ISTOffset = 5.5 * 60 * 60 * 1000; // IST is UTC + 5:30
    const currentISTTime = new Date(currentTimeUTC.getTime() + ISTOffset);
    const currentISTTimeISO = currentISTTime.toISOString().split('.')[0] + '+05:30';
    // Function to format time in IST manually
    const formatToIST = (inputDate, timeString) => {
      const [hours, minutes, seconds] = timeString.split(':');
      const dateObj = new Date(inputDate);
      // Manually set hours, minutes, and seconds
      dateObj.setHours(hours);
      dateObj.setMinutes(minutes);
      dateObj.setSeconds(seconds || 0); // If seconds are not provided, default to 0
      // Adjust for IST (UTC + 05:30)
      const ISTOffset = 5.5 * 60 * 60 * 1000;
      const dateIST = new Date(dateObj.getTime());
      // Convert to ISO format and replace 'Z' with '+05:30'
      return dateIST.toISOString().split('.')[0] + '+05:30';
    };
    allSlots.forEach((slot) => {
      const slotTimeISO = formatToIST(inputDate, slot.m_schd_from);
      console.log("kaif", slotTimeISO , currentISTTimeISO , inputDate , currentTimeUTC);
      if (slotTimeISO < currentISTTimeISO && inputDate < currentTimeUTC) {
        slot.m_booked_status = 2; // Mark slots in the past with status 2
      }
    });
    // Check for existing bookings on the given date
    const bookings = therapist.booking_slots
      ? therapist.booking_slots.filter(
          (b) =>
            new Date(b.booking_date).toDateString() === inputDate.toDateString()
        )
      : [];
    if (bookings.length > 0) {
      // Update the booked status for the slots
      allSlots.forEach((slot) => {
        bookings.forEach((booking) => {
          const bookedSlot = booking.booking_slots.find(
            (b) =>
              b.m_schd_from === slot.m_schd_from &&
              b.m_schd_to === slot.m_schd_to
          );
          if (bookedSlot) {
            slot.m_booked_status = 1;
          }
        });
      });
    }
    return res.status(200).json({
      message: "Slots retrieved successfully.",
      data: {
        date: inputDate.toDateString(),
        day: day,
        slots: allSlots,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error,
    });
  }
};







const deleteTherapistSlot = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { day, start_time, end_time } = req.body;

    if (day === undefined || day === null || !start_time || !end_time) {
      return res.status(400).json({
        message: "Day, start time, and end time are required.",
        error: true,
      });
    }

    const db = getDb();
    const therapistCollection = db.collection("users");
    const therapist = await therapistCollection.findOne({
      _id: new ObjectId(therapistId),
    });

    if (!therapist) {
      return res.status(404).json({
        message: "Therapist not found.",
        error: true,
      });
    }

    const dayIndex = therapist.slots
      ? therapist.slots.findIndex((d) => d.day === day)
      : -1;

    if (dayIndex === -1) {
      return res.status(404).json({
        message: "No slots found for the specified day.",
        error: true,
      });
    }

    const daySlots = therapist.slots[dayIndex].slots;
    const slotIndex = daySlots.findIndex(
      (slot) => slot.m_schd_from === start_time && slot.m_schd_to === end_time
    );

    if (slotIndex === -1) {
      return res.status(404).json({
        message: "Slot not found for the specified time range.",
        error: true,
      });
    }

    // Ensure the slot isn't part of preconsultation slots before deleting
    const preconsultationDaySlots = therapist.preconsultation_slots
      ? therapist.preconsultation_slots.find((d) => d.day === day)
      : null;

    if (preconsultationDaySlots) {
      const preconsultationSlotIndex = preconsultationDaySlots.slots.findIndex(
        (slot) => slot.m_schd_from === start_time && slot.m_schd_to === end_time
      );

      if (preconsultationSlotIndex !== -1) {
        return res.status(400).json({
          message:
            "Cannot delete slot because it is part of preconsultation slots.",
          error: true,
        });
      }
    }

    // Remove the slot
    daySlots.splice(slotIndex, 1);

    if (daySlots.length === 0) {
      // If no slots are left for the day, remove the day entry
      therapist.slots.splice(dayIndex, 1);
    }

    const updateResult = await therapistCollection.updateOne(
      { _id: new ObjectId(therapistId) },
      { $set: { slots: therapist.slots } }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        message: "Failed to update the slots.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Slot deleted successfully.",
      data: {
        day: day,
        start_time: start_time,
        end_time: end_time,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const deleteTherapistPreconsultationSlots = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { day, start_time, end_time } = req.body;

    if (day === undefined || day === null || !start_time || !end_time) {
      return res.status(400).json({
        message: "Day, start time, and end time are required.",
        error: true,
      });
    }

    const db = getDb();
    const collection = db.collection("users");

    const therapist = await collection.findOne({
      _id: new ObjectId(therapistId),
    });

    if (!therapist) {
      return res.status(404).json({
        message: "Therapist not found.",
        error: true,
      });
    }

    const dayIndex = therapist.preconsultation_slots
      ? therapist.preconsultation_slots.findIndex((d) => d.day === day)
      : -1;

    if (dayIndex === -1) {
      return res.status(404).json({
        message: "No preconsultation slots found for the specified day.",
        error: true,
      });
    }

    const daySlots = therapist.preconsultation_slots[dayIndex].slots;
    const slotIndex = daySlots.findIndex(
      (slot) => slot.m_schd_from === start_time && slot.m_schd_to === end_time
    );

    if (slotIndex === -1) {
      return res.status(404).json({
        message: "Preconsultation slot not found for the specified time range.",
        error: true,
      });
    }

    daySlots.splice(slotIndex, 1);

    const updateResult = await collection.updateOne(
      { _id: new ObjectId(therapistId) },
      { $set: { [`preconsultation_slots.${dayIndex}.slots`]: daySlots } }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(500).json({
        message: "Failed to delete the preconsultation slot.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Preconsultation slot deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error,
    });
  }
};

const generateTherapistSlots = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { day, start_time, end_time } = req.body;

    if (!therapistId) {
      return res.status(400).json({
        message: "Therapist ID is required.",
        error: true,
      });
    }

    if (typeof day !== "number" || day < 0 || day > 6) {
      return res.status(400).json({
        message:
          "Invalid day. Provide a number between 0 (Sunday) and 6 (Saturday).",
        error: true,
      });
    }

    if (!start_time || !end_time) {
      return res.status(400).json({
        message: "Start time and end time are required.",
        error: true,
      });
    }

    const startTime = moment(start_time, "HH:mm:ss", true);
    const endTime = moment(end_time, "HH:mm:ss", true);

    if (!startTime.isValid() || !endTime.isValid()) {
      return res.status(400).json({
        message: "Invalid time format. Use HH:mm:ss format.",
        error: true,
      });
    }

    if (startTime.isAfter(endTime)) {
      return res.status(400).json({
        message: "Start time must be before end time.",
        error: true,
      });
    }

    const newSlots = generateTimeSlots(startTime, endTime);

    const db = getDb();
    const therapistCollection = db.collection("users");
    const therapist = await therapistCollection.findOne({
      _id: new ObjectId(therapistId),
      role: "therapist",
      isActive: true,
    });

    if (!therapist) {
      return res.status(404).json({
        message: "Therapist not found or inactive.",
        error: true,
      });
    }
    if(!therapist.slots){
      therapist.slots=[]
    }
    // Check for overlapping with existing normal slots
    let existingDaySlots = therapist.slots
      ? therapist.slots.find((d) => d.day === day)
      : null;

    if (existingDaySlots) {
      for (const newSlot of newSlots) {
        for (const existingSlot of existingDaySlots.slots) {
          if (doSlotsOverlap(newSlot, existingSlot)) {
            return res.status(400).json({
              message: "Time range overlaps with existing normal slots.",
              error: true,
            });
          }
        }
      }
    }

    // Check for overlapping with preconsultation slots
    const preconsultationDaySlots = therapist.preconsultation_slots
      ? therapist.preconsultation_slots.find((d) => d.day === day)
      : null;

    if (preconsultationDaySlots) {
      for (const newSlot of newSlots) {
        for (const preSlot of preconsultationDaySlots.slots) {
          if (doSlotsOverlap(newSlot, preSlot)) {
            return res.status(400).json({
              message:
                "Time range overlaps with existing preconsultation slots.",
              error: true,
            });
          }
        }
      }
    }

    // If no overlap, add the new slots
    if (existingDaySlots) {
      existingDaySlots.slots.push(...newSlots);
    } else {
      therapist.slots.push({
        day: day,
        slots: newSlots,
      });
    }

    const updateResult = await therapistCollection.updateOne(
      { _id: new ObjectId(therapistId), isActive: true },
      { $set: { slots: therapist.slots } }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        message: "Failed to update the slots.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Slots generated successfully.",
      data: { day: day, slots: newSlots },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const generateTherapistPreconsultationSlots = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { day, start_time, end_time } = req.body;

    if (!therapistId) {
      return res.status(400).json({
        message: "Therapist ID is required.",
        error: true,
      });
    }

    if (typeof day !== "number" || day < 0 || day > 6) {
      return res.status(400).json({
        message:
          "Invalid day. Please provide a number between 0 (Sunday) and 6 (Saturday).",
        error: true,
      });
    }

    if (!start_time || !end_time) {
      return res.status(400).json({
        message: "Start time and end time are required.",
        error: true,
      });
    }

    const startTime = moment(start_time, "HH:mm:ss", true);
    const endTime = moment(end_time, "HH:mm:ss", true);

    if (!startTime.isValid() || !endTime.isValid()) {
      return res.status(400).json({
        message: "Invalid time format. Please use HH:mm:ss format.",
        error: true,
      });
    }

    if (startTime.isAfter(endTime)) {
      return res.status(400).json({
        message: "Start time must be before end time.",
        error: true,
      });
    }

    const newSlots = generateTimeSlots(startTime, endTime);

    const db = getDb();
    const therapistCollection = db.collection("users");
    const therapist = await therapistCollection.findOne({
      _id: new ObjectId(therapistId),
      role: "therapist",
      isActive: true,
    });

    if (!therapist) {
      return res.status(404).json({
        message: "Therapist not found or inactive.",
        error: true,
      });
    }

    if (!therapist.preconsultation_slots) {
      therapist.preconsultation_slots = [];
    }

    const existingDaySlots = therapist.slots
      ? therapist.slots.find((d) => d.day === day)
      : null;

    if (existingDaySlots) {
      for (const newSlot of newSlots) {
        for (const existingSlot of existingDaySlots.slots) {
          if (doSlotsOverlap(newSlot, existingSlot)) {
            return res.status(400).json({
              message: "Time range overlaps with existing normal slots.",
              error: true,
            });
          }
        }
      }
    }

    let existingPreconsultationDaySlots = therapist.preconsultation_slots.find(
      (d) => d.day === day
    );

    if (existingPreconsultationDaySlots) {
      for (const newSlot of newSlots) {
        for (const existingSlot of existingPreconsultationDaySlots.slots) {
          if (doSlotsOverlap(newSlot, existingSlot)) {
            return res.status(400).json({
              message:
                "Time range overlaps with existing preconsultation slots.",
              error: true,
            });
          }
        }
      }
      existingPreconsultationDaySlots.slots.push(...newSlots);
    } else {
      therapist.preconsultation_slots.push({
        day: day,
        slots: newSlots,
      });
    }

    const updateResult = await therapistCollection.updateOne(
      { _id: new ObjectId(therapistId), isActive: true },
      { $set: { preconsultation_slots: therapist.preconsultation_slots } }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        message: "Failed to update the preconsultation slots.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Preconsultation slots generated successfully.",
      data: { day: day, slots: newSlots },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const generateTimeSlots = (startTime, endTime) => {
  const slots = [];
  let current = startTime.clone();

  while (current.isBefore(endTime)) {
    const next = current.clone().add(30, "minutes");
    slots.push({
      m_schd_from: current.format("HH:mm:ss"),
      m_schd_to: next.format("HH:mm:ss"),
      m_booked_status: 0,
    });
    current = next;
  }

  return slots;
};

const doSlotsOverlap = (slot1, slot2) => {
  const start1 = moment(slot1.m_schd_from, "HH:mm:ss");
  const end1 = moment(slot1.m_schd_to, "HH:mm:ss");
  const start2 = moment(slot2.m_schd_from, "HH:mm:ss");
  const end2 = moment(slot2.m_schd_to, "HH:mm:ss");

  return start1.isBefore(end2) && start2.isBefore(end1);
};

const getAppointmentDetail = async (req, res) => {
  try {
    // Extract the appointmentId from the request parameters
    const { appointmentId } = req.body;

    // Validate the appointmentId
    if (!ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        message: "Invalid appointment ID.",
        error: true,
      });
    }

    const db = getDb();
    const appointmentCollection = db.collection("appointments");

    // Find the appointment by its ID
    const appointment = await appointmentCollection.findOne({
      _id: new ObjectId(appointmentId),
    });

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found.",
        error: true,
      });
    }

    // Retrieve the user details
    const userCollection = db.collection("users");
    const user = await userCollection.findOne(
      { _id: new ObjectId(appointment.user_id) },
      { projection: { name: 1, _id: 1, phone_number: 1, "profile_details.dob": 1, email: 1 } }
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
        error: true,
      });
    }

    // Retrieve the booking history for the user
    const bookingHistory = await appointmentCollection
      .find({ user_id: appointment.user_id })
      .toArray();

    // Prepare the response object
    const response = {
      appointmentDetails: appointment,
      userDetails: user,
      bookingHistory: bookingHistory.filter(
        (item) => item._id.toString() !== appointmentId
      ), // Exclude the current appointment from booking history
    };

    // Return the appointment details along with user details and booking history
    return res.status(200).json({
      message: "Appointment details retrieved successfully.",
      data: response,
    });
  } catch (error) {
    console.log("Error retrieving appointment details:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getAllAppointmentsByType = async (req, res) => {
  try {
    const db = getDb();
    const { type } = req.params;
    const appointmentCollection = db.collection("appointments");
    const userCollection = db.collection("users");
    const userDetails = req.user;

    // Query to find all appointments of the given type
    const appointments = await appointmentCollection.find({user_id:userDetails?._id , type: type }).toArray();

    if (!appointments || appointments.length === 0) {
      return res.status(404).json({
        message: `No ${type} appointments found.`,
        error: true,
      });
    }

    // For each appointment, get the therapist's name from the users collection
    const updatedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        const therapistId = appointment.therapist_id;
        const therapist = await userCollection.findOne(
          { _id: therapistId },
          { projection: { name: 1, "profile_details.google_meet_link":1} } // Only fetch the therapist's name
        );

        // Add the therapist's name to the appointment object
        
        console.log("app details>>",therapist?.profile_details?.google_meet_link)
        return {
          ...appointment,
          therapist_name: therapist ? therapist.name : "Unknown Therapist",
          meet_link: therapist ? therapist?.profile_details?.google_meet_link : "No meet link available"
        };
      })
    );

    return res.status(200).json({
      message: `${type} appointments retrieved successfully.`,
      data: updatedAppointments,
    });
  } catch (error) {
    console.log(`Error retrieving ${type} appointments:`, error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getUpcomingAppointments = async (req, res) => {
  try {
    const { type } = req.params;

    if (!type) {
      return res.status(400).json({
        message: "Invalid or missing type. It must be either 'preconsultation' or 'session'.",
        error: true,
      });
    }

    const db = getDb();
    const appointmentCollection = db.collection("appointments");
    const usersCollection = db.collection("users");
    const therapistDetails = req.user;

    // Get current time in IST
    const currentTime = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const currentISTTime = new Date(currentTime.getTime() + istOffset);

    // Set the start of the day in IST
    const today = new Date(currentISTTime);
    today.setHours(0, 0, 0, 0); // Set to start of the day

    // Get upcoming appointments for today
    const upcomingAppointments = await appointmentCollection
      .find({
        type: type,
        therapist_id: therapistDetails?._id,
        booking_date: { $gte: today }, // Appointments today and in the future
      })
      .toArray();

    // Get the user IDs from appointments and convert them to ObjectId
    const userIds = upcomingAppointments
      .map((appointment) => appointment.user_id)
      .filter(Boolean)
      .map((id) => new ObjectId(id));

    // Get user details (including clientName) for these user IDs
    const users = await usersCollection.find({ _id: { $in: userIds } }).toArray();

    const userMap = users.reduce((map, user) => {
      map[user._id.toString()] = user;
      return map;
    }, {});

    // Attach the clientName and meet_link to the appointments
    const enrichedAppointments = upcomingAppointments.map((appointment) => {
      const bookingTime = new Date(appointment.booking_date);
      const [hours, minutes] = appointment.booking_slots[0].m_schd_from.split(":").map(Number);
      bookingTime.setHours(hours, minutes, 0, 0);
    
  
    
      // Update booking_status to 4 if within 15 minutes of the start time and before 10:00 AM
      let meetLink = therapistDetails?.profile_details?.google_meet_link || "No meet link available"; // Default value for meet link// Default value for meet link
    
      return {
        ...appointment,
        clientName: userMap[appointment.user_id]?.name || "Unknown", // Attach clientName or 'Unknown'
        meet_link: meetLink, // Include meet link conditionally
      };
    });    

    return res.status(200).json({
      message: "Upcoming appointments retrieved successfully.",
      data: enrichedAppointments,
    });
  } catch (error) {
    console.log("Error fetching upcoming appointments:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getPastAppointments = async (req, res) => {
  try {
    const { type } = req.params;

    if (!type) {
      return res.status(400).json({
        message: "Invalid or missing type. It must be either 'preconsultation' or 'session'.",
        error: true,
      });
    }

    const db = getDb();
    const appointmentCollection = db.collection("appointments");
    const usersCollection = db.collection("users");
    const therapist_id=req.user._id
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of the day

    // Get past appointments
    const pastAppointments = await appointmentCollection
      .find({
        type: type,
        therapist_id,
        booking_date: { $lt: today }, // Filter for past dates
      })
      .toArray();

    // Get the user IDs from appointments and convert them to ObjectId
    const userIds = pastAppointments
      .map((appointment) => appointment.user_id)
      .filter(Boolean)
      .map((id) => new ObjectId(id));

    const users = await usersCollection.find({ _id: { $in: userIds } }).toArray();

    const userMap = users.reduce((map, user) => {
      map[user._id.toString()] = user;
      return map;
    }, {});

    // Attach the clientName to the appointments
    const enrichedAppointments = pastAppointments.map((appointment) => ({
      ...appointment,
      clientName: userMap[appointment.user_id]?.name || "Unknown",
    }));

    return res.status(200).json({
      message: "Past appointments retrieved successfully.",
      data: enrichedAppointments,
    });
  } catch (error) {
    console.log("Error fetching past appointments:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const bookAppointmentByTherapist = async (req, res) => {
  try {
    const therapistDetails = req.user;

    const db = getDb();

    const collection = db.collection("users");

    if (!therapistDetails) {
      return res.status(400).json({
        message: "User is not present",
        error: true,
      });
    }

    const { bookingDate, bookingSlots, duration, userId, bookingType, type } =
      req.body;

    if (!bookingDate || !bookingSlots || !duration || !userId || !type) {
      return res.status(400).json({
        message: "bookingDate, slots, duration, userId, Type are required.",
        error: true,
      });
    }

    const validDate = moment(bookingDate, "YYYY-MM-DD", true).isValid();

    if (!validDate) {
      return res.status(400).json({
        message: "Invalid Date Format",
        error: true,
      });
    }

    if (!Array.isArray(bookingSlots) || bookingSlots.length === 0) {
      return res.status(400).json({
        message: "Slots must be a non-empty array.",
        error: true,
      });
    }

    const appointmentBookingType = type === "session" ? bookingType : "video";
    const employee = await collection.findOne({ _id: new ObjectId(userId) });

    if (!employee) {
      return res.status(400).json({
        message: "Specified employee not found or inactive.",
        error: true,
      });
    }

    const pricing = therapistDetails.sessionPricing[appointmentBookingType];

    if (!pricing) {
      return res.status(400).json({
        message: "Invalid booking type.",
        error: true,
      });
    }

    const amount = pricing[duration];
    if (!amount) {
      return res.status(400).json({
        message: "Invalid duration for the specified booking type.",
        error: true,
      });
    }

    const appointment = {
      therapist_id: therapistDetails?._id,
      booking_date: new Date(bookingDate),
      booking_duration: parseInt(duration),
      booking_slots: bookingSlots,
      booking_type: appointmentBookingType,
      user_id: new ObjectId(userId) ,
      booking_status: 1,
      created_at: moment().toISOString(),
      payment_status: 0,
      amount: amount,
      type: type,
    };

    const bookingSlot = {
      booking_date: new Date(bookingDate),
      booking_slots: bookingSlots,
    };

    // const appointmentCollection = await getCollectionRef("appointment");
    const appointmentCollection = db.collection("appointments");

    const result = await appointmentCollection.insertOne(appointment);

    const appointmentId = result.insertedId.toString();

    await collection.updateOne(
      { _id: new ObjectId(userId) },
      { $addToSet: { appointments: appointmentId } }
    );

    await collection.updateOne(
      { _id: new ObjectId(therapistDetails?._id) },
      { $addToSet: { booking_slots: bookingSlot } }
    );

    return res.status(200).json({
      message: "Appointment booked successfully.",
    });
  } catch (error) {
    console.log("Error updating booking slots and booking appointment:", error);
    return res.status(400).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const rescheduleAppointmentByTherapist = async (req, res) => {
  try {
    const therapistDetails = req.user;
    const db = getDb();

    const {
      appointmentId,
      newDate,
      newSlots,
      newDuration,
      newAppointmentType,
    } = req.body;

    if (!therapistDetails) {
      return res.status(400).json({
        message: "Therapist not authenticated",
        error: true,
      });
    }

    if (!appointmentId || !newDate || !newSlots || !newDuration) {
      return res.status(400).json({
        message: "appointmentId, newDate, newSlots, newDuration are required.",
        error: true,
      });
    }
    const appointmentBookingType =
      type === "session" ? newAppointmentType : "video";
    if (!ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        message: "Invalid Appointment ID",
        error: true,
      });
    }

    const validDate = moment(newDate, "YYYY-MM-DD", true).isValid();
    if (!validDate) {
      return res.status(400).json({
        message: "Invalid Date Format",
        error: true,
      });
    }

    if (!Array.isArray(newSlots) || newSlots.length === 0) {
      return res.status(400).json({
        message: "Slots must be a non-empty array.",
        error: true,
      });
    }

    const appointmentsCollection = db.collection("appointments");
    const usersCollection = db.collection("users");

    // Find the appointment
    const appointment = await appointmentsCollection.findOne({
      _id: new ObjectId(appointmentId),
      therapist_id: therapistDetails._id,
    });

    if (!appointment) {
      return res.status(400).json({
        message:
          "Appointment not found or you are not authorized to reschedule this appointment.",
        error: true,
      });
    }

    // Update the appointment with new details
    const updateResult = await appointmentsCollection.updateOne(
      { _id: new ObjectId(appointmentId) },
      {
        $set: {
          booking_date: new Date(newDate),
          booking_duration: parseInt(newDuration),
          booking_slots: newSlots,
          booking_type: appointmentBookingType,
          updated_at: moment().toISOString(),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(400).json({
        message: "Appointment not found or update failed.",
        error: true,
      });
    }

    // Find the therapist's current booking slots
    const therapist = await usersCollection.findOne({
      _id: new ObjectId(therapistDetails._id),
      isActive: true,
    });

    if (!therapist) {
      return res.status(400).json({
        message: "Therapist not found.",
        error: true,
      });
    }

    // Format date function
    const formatDate = (date) => {
      const d = new Date(date);
      return d.toISOString().split("T")[0];
    };

    // Remove the previous booking slots
    const filteredBookingSlots = therapist.booking_slots.filter((booking) => {
      const bookingDateMatch =
        formatDate(booking.booking_date) ===
        formatDate(appointment.booking_date);
      const slotsMatch = booking.booking_slots.every((slot) => {
        return appointment.booking_slots.some(
          (bSlot) =>
            bSlot.m_schd_from === slot.m_schd_from &&
            bSlot.m_schd_to === slot.m_schd_to
        );
      });
      return !(bookingDateMatch && slotsMatch);
    });

    // Add the new booking slots
    const newBookingSlot = {
      booking_date: new Date(newDate),
      booking_slots: newSlots,
    };

    const updatedBookingSlots = [...filteredBookingSlots, newBookingSlot];

    // Update the therapist document with new booking slots
    const therapistUpdateResult = await usersCollection.updateOne(
      { _id: new ObjectId(therapistDetails._id), isActive: true },
      { $set: { booking_slots: updatedBookingSlots } }
    );

    if (therapistUpdateResult.matchedCount === 0) {
      return res.status(400).json({
        message: "Therapist not found or booking slots not updated.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Appointment rescheduled successfully",
      error: false,
    });
  } catch (error) {
    console.log("Error rescheduling appointment:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const cancelAppointmentByTherapist = async (req, res) => {
  try {
    const therapistDetails = req.user; // Assuming therapist details are available in req.user after authentication

    const db = getDb();
    const { app_id } = req.body;

    if (!therapistDetails) {
      return res.status(400).json({
        message: "Therapist not authenticated.",
        error: true,
      });
    }

    if (!app_id || !ObjectId.isValid(app_id)) {
      return res.status(400).json({
        message: "Invalid appointment ID.",
        error: true,
      });
    }

    const appointment_id = new ObjectId(app_id);

    const employeeCollection = db.collection("users");
    const appointmentCollection = db.collection("appointments");

    // Find the appointment to ensure it belongs to the authenticated therapist
    const appointment = await appointmentCollection.findOne({
      _id: appointment_id,
      therapist_id: therapistDetails._id,
    });

    if (!appointment) {
      return res.status(400).json({
        message:
          "Appointment not found or you are not authorized to cancel this appointment.",
        error: true,
      });
    }

    // Update the booking status of the appointment to 'canceled'
    const result = await appointmentCollection.updateOne(
      { _id: appointment_id, booking_status: { $ne: 2 } }, // Check if booking_status is not equal to 2
      { $set: { booking_status: 5 } }
    );    

    if (result.matchedCount === 0) {
      return res.status(400).json({
        message: "Appointment not found or already updated.",
        error: true,
      });
    }

    // Find the therapist's booking slots
    const therapist = await employeeCollection.findOne({
      _id: new ObjectId(therapistDetails._id),
      role: "therapist",
      isActive: true,
    });

    if (!therapist) {
      return res.status(400).json({
        message: "Therapist not found.",
        error: true,
      });
    }

    const formatDate = (date) => {
      const d = new Date(date);
      return d.toISOString().split("T")[0];
    };

    // Filter out the canceled booking slot from the therapist's booking slots
    const updatedBookingSlots = therapist.booking_slots.filter((booking) => {
      const bookingDateMatch =
        formatDate(booking.booking_date) ===
        formatDate(appointment.booking_date);
      const slotsMatch = booking.booking_slots.every((slot) => {
        return appointment.booking_slots.some(
          (bSlot) =>
            bSlot.m_schd_from === slot.m_schd_from &&
            bSlot.m_schd_to === slot.m_schd_to
        );
      });

      return !(bookingDateMatch && slotsMatch);
    });

    if (updatedBookingSlots.length === therapist.booking_slots.length) {
      return res.status(400).json({
        message: "No matching booking slot found.",
        error: true,
      });
    }

    // Update the therapist's document with the new booking slots
    const updateResult = await employeeCollection.updateOne(
      {
        _id: new ObjectId(therapistDetails._id),
        role: "therapist",
        isActive: true,
      },
      { $set: { booking_slots: updatedBookingSlots } }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(400).json({
        message: "No matching booking slot found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Appointment canceled and booking slot updated successfully.",
      error: false,
    });
  } catch (error) {
    console.log("Error canceling appointment by therapist:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const addPrescription = async (req, res) => {
  try {
    const { appointmentId, title, dosage, instructions, description } =
      req.body;

    // Check for missing required fields
    if (!appointmentId || !title || !dosage || !instructions) {
      return res.status(400).json({
        message: "Missing required fields.",
        error: true,
      });
    }

    // Validate the appointmentId
    if (!ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        message: "Invalid appointment ID.",
        error: true,
      });
    }

    // Create the prescription object
    const prescription = {
      title,
      dosage,
      instructions,
      description,
      created_at: moment().toISOString(),
    };

    // Get a reference to the appointments collection
    const db = getDb();
    const appointmentsCollection = await db.collection("appointments");

    // Update the appointment with the new prescription
    const result = await appointmentsCollection.updateOne(
      { _id: new ObjectId(appointmentId) },
      { $push: { prescriptions: prescription } }
    );

    // Check if the update was successful
    if (result.modifiedCount === 0) {
      return res.status(500).json({
        message: "Failed to add prescription.",
        error: true,
      });
    }

    // Return success response
    return res.status(200).json({
      message: "Prescription added successfully.",
      data: prescription,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getPrescriptionList = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    // Validate the appointmentId
    if (!ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        message: "Invalid appointment ID.",
        error: true,
      });
    }

    // Get a reference to the appointments collection
    const db = getDb();
    const appointmentsCollection = await db.collection("appointments");

    // Find the appointment by ID and retrieve the prescriptions field
    const appointment = await appointmentsCollection.findOne(
      { _id: new ObjectId(appointmentId) },
      { projection: { prescriptions: 1 } } // Only retrieve the prescriptions field
    );

    // Check if the appointment was found
    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found.",
        error: true,
      });
    }

    // Return the prescription list
    return res.status(200).json({
      message: "Prescriptions retrieved successfully.",
      data: appointment.prescriptions || [], // Default to an empty array if no prescriptions exist
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const changeBookingStatus = async (req, res) => {
  try {
    const { app_id } = req.body;

    // Log the appointment ID for debugging
    console.log("book status", app_id);

    // Validate the appointment ID
    if (!app_id || !ObjectId.isValid(app_id)) {
      return res.status(400).json({
        message: "Invalid appointment ID.",
        error: true,
      });
    }

    const appointment_id = new ObjectId(app_id);

    // Get a reference to the appointment collection
    const db = getDb();
    const appointmentCollection = await db.collection("appointments");

    const currentDate = new Date();
    currentDate.setUTCHours(0, 0, 0, 0); // Set time to 00:00:00 for date comparison

    // Get the current time (UTC)
    const currentTime = new Date().toTimeString().split(' ')[0]; // Get time in HH:MM:SS format

    // Find the appointment and check conditions
    const appointment = await appointmentCollection.findOne({ _id: appointment_id });

    // Check if appointment exists
    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found.",
        error: true,
      });
    }

    // Check if the booking date is in the future
    const bookingDate = new Date(appointment.booking_date);
    if (bookingDate > currentDate) {
      return res.status(400).json({
        message: "Booking status cannot be changed before the booking date.",
        error: true,
      });
    }

    // Check if the payment status is 0
    if (appointment.payment_status === 0) {
      return res.status(400).json({
        message: "Booking status cannot be changed due to incomplete payment.",
        error: true,
      });
    }

    // Check if the current time is before the booking slot time
    const bookingSlotTime = appointment.booking_slots[0].m_schd_from;
    if (currentTime < bookingSlotTime) {
      return res.status(400).json({
        message: `Booking status cannot be changed before the scheduled time. The session starts at ${bookingSlotTime}.`,
        error: true,
      });
    }

    // Update the booking status to 2 if the current status is 1
    const result = await appointmentCollection.updateOne(
      { _id: appointment_id, booking_status: 1 },
      { $set: { booking_status: 2 } }
    );

    // Check if the appointment was found and updated
    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Appointment not found or already updated.",
        error: true,
      });
    }

    // Return success response
    return res.status(200).json({
      message: "Booking status updated successfully.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const bookSupervisionAppointment = async (req, res) => {
  try {
    const userDetails = req.user;

    const db = getDb();

    const collection = db.collection("users");
    const adminCollection = db.collection("admin");
    const supervisionCollection = db.collection("supervision");

    if (!userDetails) {
      return res.status(400).json({
        message: "User is not present",
        error: true,
      });
    }

    const {
      bookingDate,
      bookingSlots,
      duration,
    } = req.body;

    if (
      !bookingDate ||
      !bookingSlots ||
      !duration
    ) {
      return res.status(400).json({
        message:
          "bookingDate, slots, duration are required.",
        error: true,
      });
    }

    const validDate = moment(bookingDate, "YYYY-MM-DD", true).isValid();

    if (!validDate) {
      return res.status(400).json({
        message: "Invalid Date Format",
        error: true,
      });
    }

    if (!Array.isArray(bookingSlots) || bookingSlots.length === 0) {
      return res.status(400).json({
        message: "Slots must be a non-empty array.",
        error: true,
      });
    }

    const employee = await collection.findOne({
      _id: new ObjectId(userDetails._id),
    });

    if (!employee) {
      return res.status(400).json({
        message: "Specified employee not found or inactive.",
        error: true,
      });
    }

    const appointment = {
      booking_date: new Date(bookingDate),
      booking_duration: parseInt(duration),
      booking_slots: bookingSlots,
      therapist_id: userDetails._id,
      booking_status: 1,
      created_at: moment().toISOString(),
    };

    const bookingSlot = {
      booking_date: new Date(bookingDate),
      booking_slots: bookingSlots,
    };

    const result = await supervisionCollection.insertOne(appointment);

    const appointmentId = result.insertedId.toString();

    await collection.updateOne(
      { _id: new ObjectId(userDetails?._id) },
      { $addToSet: { supervision_app_id: appointmentId } }
    );

    await adminCollection.updateOne(
      {role: "admin" },
      { $addToSet: { booking_slots: bookingSlot } }
    );

    return res.status(200).json({
      message: "SupervisionAppointment booked successfully.",
    });
  } catch (error) {
    console.log("Error updating booking slots and booking appointment:", error);
    return res.status(400).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const rescheduleSupervisionAppointment = async (req, res) => {
  try {
    const db = getDb();
    const userDetails = req.user ;
    const { supervisionId } = req.params;
    const {
      bookingDate,
      bookingSlots,
      duration,
    } = req.body;

    if (
      !supervisionId ||
      !bookingDate ||
      !bookingSlots ||
      !duration
    ) {
      return res.status(400).json({
        message:
          "bookingDate, slots, duration, therapistId, and bookingType are required.",
        error: true,
      });
    }

    if (!ObjectId.isValid(supervisionId)) {
      return res.status(400).json({
        message: "Invalid AppointmentId",
        error: true,
      });
    }

    const validDate = moment(bookingDate, "YYYY-MM-DD", true).isValid();
    if (!validDate) {
      return res.status(400).json({
        message: "Invalid Date Format",
        error: true,
      });
    }

    if (!Array.isArray(bookingSlots) || bookingSlots.length === 0) {
      return res.status(400).json({
        message: "Slots must be a non-empty array.",
        error: true,
      });
    }

    const employeeCollection = db.collection("admin");
    const supervisionCollection = db.collection("supervision");

    // Find the appointment
    const appointment = await supervisionCollection.findOne({
      _id: new ObjectId(supervisionId),
    });

    if (!appointment) {
      return res.status(400).json({
        message:
          "Appointment not found or you are not authorized to reschedule this appointment.",
        error: true,
      });
    }

    // Update the appointment with new details
    const updateResult = await supervisionCollection.updateOne(
      { _id: new ObjectId(supervisionId) },
      {
        $set: {
          booking_date: new Date(bookingDate),
          booking_duration: parseInt(duration),
          booking_slots: bookingSlots,
          updated_at: moment().toISOString(),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(400).json({
        message: "Appointment not found or update failed.",
        error: true,
      });
    }

    // Find the employee by emp_id
    const employee = await employeeCollection.findOne({role: "admin" });

    if (!employee) {
      return res.status(400).json({
        message: "Employee not found.",
        error: true,
      });
    }

    // Format date function
    const formatDate = (date) => {
      const d = new Date(date);
      return d.toISOString().split("T")[0];
    };

    // Remove the previous booking slots
    const filteredBookingSlots = employee.booking_slots.filter((booking) => {
      const bookingDateMatch =
        formatDate(booking.booking_date) ===
        formatDate(appointment.booking_date);
      const slotsMatch = booking.booking_slots.every((slot) => {
        return appointment.booking_slots.some(
          (bSlot) =>
            bSlot.m_schd_from === slot.m_schd_from &&
            bSlot.m_schd_to === slot.m_schd_to
        );
      });
      return !(bookingDateMatch && slotsMatch);
    });

    // Add the new booking slots
    const newBookingSlot = {
      booking_date: new Date(bookingDate),
      booking_slots: bookingSlots,
    };

    const updatedBookingSlots = [...filteredBookingSlots, newBookingSlot];

    // Update the employee document
    const employeeUpdateResult = await employeeCollection.updateOne(
      {role: "admin" },
      { $set: { booking_slots: updatedBookingSlots } }
    );

    if (employeeUpdateResult.matchedCount === 0) {
      return res.status(400).json({
        message: "Employee not found or booking slots not updated.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Reschedule Appointment successfully",
      error: true,
    });
  } catch (error) {
    console.log("Error rescheduling appointment:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getAllSupervision = async (req, res) => {
  try {
    const db = getDb();
    const userDetails = req.user;

    const supervisionCollection = db.collection("supervision");

    const supervision = await supervisionCollection
      .find({ therapist_id: userDetails._id })
      .toArray();

    if (!supervision || supervision.length === 0) {
      return res.status(404).json({
        message: "No preconsultation supervision found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "supervision retrieved successfully.",
      data: supervision,
    });
  } catch (error) {
    console.log("Error retrieving appointments:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const bookSelfTherapyAppointment = async (req, res) => {
  try {
    const userDetails = req.user;

    const db = getDb();

    const collection = db.collection("users");
    const adminCollection = db.collection("admin");
    const supervisionCollection = db.collection("selftherapy");

    if (!userDetails) {
      return res.status(400).json({
        message: "User is not present",
        error: true,
      });
    }

    const {
      bookingDate,
      bookingSlots,
      duration,
    } = req.body;

    if (
      !bookingDate ||
      !bookingSlots ||
      !duration
    ) {
      return res.status(400).json({
        message:
          "bookingDate, slots, duration are required.",
        error: true,
      });
    }

    const validDate = moment(bookingDate, "YYYY-MM-DD", true).isValid();

    if (!validDate) {
      return res.status(400).json({
        message: "Invalid Date Format",
        error: true,
      });
    }

    if (!Array.isArray(bookingSlots) || bookingSlots.length === 0) {
      return res.status(400).json({
        message: "Slots must be a non-empty array.",
        error: true,
      });
    }

    const employee = await collection.findOne({
      _id: new ObjectId(userDetails._id),
    });

    if (!employee) {
      return res.status(400).json({
        message: "Specified employee not found or inactive.",
        error: true,
      });
    }

    const appointment = {
      booking_date: new Date(bookingDate),
      booking_duration: parseInt(duration),
      booking_slots: bookingSlots,
      therapist_id: userDetails._id,
      booking_status: 1,
      created_at: moment().toISOString(),
    };

    const bookingSlot = {
      booking_date: new Date(bookingDate),
      booking_slots: bookingSlots,
    };

    const result = await supervisionCollection.insertOne(appointment);

    const appointmentId = result.insertedId.toString();

    await collection.updateOne(
      { _id: new ObjectId(userDetails?._id) },
      { $addToSet: { supervision_app_id: appointmentId } }
    );

    await adminCollection.updateOne(
      {role: "admin" },
      { $addToSet: { self_therapy_booking_slots: bookingSlot } }
    );

    return res.status(200).json({
      message: "SupervisionAppointment booked successfully.",
    });
  } catch (error) {
    console.log("Error updating booking slots and booking appointment:", error);
    return res.status(400).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const rescheduleSelfTherapyAppointment = async (req, res) => {
  try {
    const db = getDb();
    const userDetails = req.user ;
    const { selftherapyId } = req.params;
    const {
      bookingDate,
      bookingSlots,
      duration,
    } = req.body;

    if (
      !selftherapyId ||
      !bookingDate ||
      !bookingSlots ||
      !duration
    ) {
      return res.status(400).json({
        message:
          "bookingDate, slots, duration, therapistId, and bookingType are required.",
        error: true,
      });
    }

    if (!ObjectId.isValid(selftherapyId)) {
      return res.status(400).json({
        message: "Invalid AppointmentId",
        error: true,
      });
    }

    const validDate = moment(bookingDate, "YYYY-MM-DD", true).isValid();
    if (!validDate) {
      return res.status(400).json({
        message: "Invalid Date Format",
        error: true,
      });
    }

    if (!Array.isArray(bookingSlots) || bookingSlots.length === 0) {
      return res.status(400).json({
        message: "Slots must be a non-empty array.",
        error: true,
      });
    }

    const employeeCollection = db.collection("admin");
    const supervisionCollection = db.collection("selftherapy");

    // Find the appointment
    const appointment = await supervisionCollection.findOne({
      _id: new ObjectId(selftherapyId),
    });

    if (!appointment) {
      return res.status(400).json({
        message:
          "Appointment not found or you are not authorized to reschedule this appointment.",
        error: true,
      });
    }

    // Update the appointment with new details
    const updateResult = await supervisionCollection.updateOne(
      { _id: new ObjectId(selftherapyId) },
      {
        $set: {
          booking_date: new Date(bookingDate),
          booking_duration: parseInt(duration),
          booking_slots: bookingSlots,
          updated_at: moment().toISOString(),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(400).json({
        message: "Appointment not found or update failed.",
        error: true,
      });
    }

    // Find the employee by emp_id
    const employee = await employeeCollection.findOne({role: "admin" });

    if (!employee) {
      return res.status(400).json({
        message: "Employee not found.",
        error: true,
      });
    }

    // Format date function
    const formatDate = (date) => {
      const d = new Date(date);
      return d.toISOString().split("T")[0];
    };

    // Remove the previous booking slots
    const filteredBookingSlots = employee.self_therapy_booking_slots.filter((booking) => {
      const bookingDateMatch =
        formatDate(booking.booking_date) ===
        formatDate(appointment.booking_date);
      const slotsMatch = booking.booking_slots.every((slot) => {
        return appointment.booking_slots.some(
          (bSlot) =>
            bSlot.m_schd_from === slot.m_schd_from &&
            bSlot.m_schd_to === slot.m_schd_to
        );
      });
      return !(bookingDateMatch && slotsMatch);
    });

    // Add the new booking slots
    const newBookingSlot = {
      booking_date: new Date(bookingDate),
      booking_slots: bookingSlots,
    };

    const updatedBookingSlots = [...filteredBookingSlots, newBookingSlot];

    // Update the employee document
    const employeeUpdateResult = await employeeCollection.updateOne(
      {role: "admin" },
      { $set: { self_therapy_booking_slots: updatedBookingSlots } }
    );

    if (employeeUpdateResult.matchedCount === 0) {
      return res.status(400).json({
        message: "Employee not found or booking slots not updated.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Reschedule Appointment successfully",
      error: true,
    });
  } catch (error) {
    console.log("Error rescheduling appointment:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getAllSelfTherapy = async (req, res) => {
  try {
    const db = getDb();
    const userDetails = req.user;

    const supervisionCollection = db.collection("selftherapy");

    const supervision = await supervisionCollection
      .find({ therapist_id: userDetails._id })
      .toArray();

    if (!supervision || supervision.length === 0) {
      return res.status(404).json({
        message: "No preconsultation supervision found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "supervision retrieved successfully.",
      data: supervision,
    });
  } catch (error) {
    console.log("Error retrieving appointments:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

module.exports = {
  getPreconsultationSlots,
  bookPreconsultationAppointment,
  bookAppointment,
  getTherapistSlots,
  generateTherapistSlots,
  getAppointmentDetail,
  getAllAppointmentsByType,
  rescheduleAppointment,
  reschedulePreconsultationAppointment,
  cancelAppointment,
  cancelPreconsultationAppointment,
  getUpcomingAppointments,
  bookAppointmentByTherapist,
  addPrescription,
  changeBookingStatus,
  rescheduleAppointmentByTherapist,
  cancelAppointmentByTherapist,
  getPastAppointments,
  getPrescriptionList,
  deleteTherapistSlot,
  getTherapistPreconsultationSlots,
  generateTherapistPreconsultationSlots,
  deleteTherapistPreconsultationSlots,
  bookSupervisionAppointment,
  getAllSupervision,
  rescheduleSupervisionAppointment,
  getSelfTherapySlots,
  bookSelfTherapyAppointment,
  rescheduleSelfTherapyAppointment,
  getAllSelfTherapy,
  generateSlots
};