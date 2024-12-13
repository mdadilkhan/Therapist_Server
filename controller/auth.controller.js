const { getDb } = require("../db/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const env = require('dotenv')
const crypto = require('crypto');
env.config()


const generateStrongPassword = () => {
  return crypto.randomBytes(8).toString('hex'); // Generates a 16-character hex string
};

const userSignup = async (req, res) => {
  try {
    const db = getDb();
    const { email, name, phoneNumber, referralCode } = req.body;

    if (!email || !name || !phoneNumber) {
      return res.status(400).json({ message: "All details are required except referralCode" });
    }
    // Check if the user already exists with the given email or phone number
    const existingUser = await db.collection("users").findOne({
      $or: [
        { email: email },
        { phone_number: phoneNumber }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: "User with this email already exists" });
      } else {
        return res.status(400).json({ message: "User with this phone number already exists" });
      }
    }
    // Create a new user with a static role 'user' and profile_details
    const newUser = {
      name,
      email,
      role: "user",
      phone_number: phoneNumber,
      profile_details: {
        referral_code: referralCode
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save the user to the database and get the inserted ID
    const result = await db.collection("users").insertOne(newUser);

    // Respond with the created user's ID
    res.status(200).json({ 
      message: "User created successfully", 
      userId: result.insertedId,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const therapistSignup = async (req, res) => {
  try {
    const db = getDb();
    const { email, password, name } = req.body;
    // Check if the user already exists
    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user with a static role 'therapist'
    const newUser = {
      name,
      email,
      password: hashedPassword,
      role: "therapist",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save the user to the database
    await db.collection("users").insertOne(newUser);

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const userSignin = async (req, res) => {
  console.log("signin active");
  try {
    const db = getDb();
    const { email, password } = req.body;
   console.log(req.body);

    // Check if the user exists
    const user = await db.collection("users").findOne({ email, role: "user" });

    if (!user) {

      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create a token

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1d" } // Token expiration time
    );


    // Send the token to the client
    res.status(200).json({
      message: "Sign-in successful",
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const therapistSignin = async (req, res) => {
  try {
    const db = getDb();
    const { email, password } = req.body;
    console.log("cbsdjbcjhsdc",req.body);
    // Check if the therapist exists
    const user = await db
      .collection("users")
      .findOne({ email, role: "therapist" });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create a token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1d" } // Token expiration time
    );

    // Send the token to the client
    res.status(200).json({
      message: "Sign-in successful",
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { userSignup, therapistSignup, userSignin, therapistSignin };
