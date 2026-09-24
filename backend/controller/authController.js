const User = require("../model/user");
const Driver = require("../model/driver");
const bcrypt = require("bcrypt");
const { getUser, setUser } = require("../service/auth");

async function handleSignUp(req, res) {
  try {
    const { name, email, password, role, vehicleName, vehicleNumber } =
      req.body;

    // Common validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Enter required field",
      });
    }

    // Validate role
    if (!["rider", "driver"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    // Driver-specific validation
    if (role === "driver" && (!vehicleName || !vehicleNumber)) {
      return res.status(400).json({
        message: "Vehicle name and vehicle number are required",
      });
    }

    // Check existing user
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    // Create driver record
    if (role === "driver") {
      const existingDriver = await Driver.findOne({
        vehicleNumber,
      });

      if (existingDriver) {
        // Important: don't leave the User behind
        await User.findByIdAndDelete(user._id);

        return res.status(409).json({
          message: "Vehicle already exists",
        });
      }

      await Driver.create({
        user: user._id,
        vehicleName,
        vehicleNumber,
      });
    }

    return res.status(201).json({
      message: "User registered successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
}

// Login
async function handleLogin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Enter require field",
      });
    }

    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email",
      });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({
        message: "Invalid password",
      });
    }

    const token = setUser(user);

    res.cookie("uid", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
}

// Logout
async function handleLogOut(req, res) {
  try {
    const token = req.cookies.uid;

    if (!token) {
      return res.status(204).send();
    }

    res.clearCookie("uid", {
      httpOnly: true,
      sameSite: "strict",
    });

    res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
}

async function handleMe(req, res) {
  try {
    const token = req.cookies.uid;

    if (!token) {
      return res.status(401).json({
        message: "Token not fouund",
      });
    }
    const user = getUser(token);

    if (!user) {
      return res.status(401).json({
        message: "Invalid token",
      });
    }

    return res.status(200).json({
      message: "User Details",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
}

module.exports = { handleSignUp, handleLogin, handleLogOut, handleMe };
