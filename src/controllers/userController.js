import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendOTPEmail } from "../mail/all_mail_formate.js";
import { UploadProfileImg, DeleteProfileImg } from "../image/All_Image_formate.js";
import fs from "fs";

// ============ HELPER FUNCTIONS ============

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "your_jwt_secret",
    { expiresIn: "7d" }
  );
};

const getLockTime = (attempts) => {
  if (attempts >= 15) return 1440;
  if (attempts >= 10) return 60;
  if (attempts >= 7) return 30;
  if (attempts >= 5) return 10;
  if (attempts >= 4) return 5;
  if (attempts >= 3) return 1;
  return 0;
};

// ============ CREATE ACCOUNT ============
export const createAccount = async (req, res) => {
  try {
    const { first_name, last_name, email, gender, password, address_list } = req.body;

    if (!req.body || Object.keys(req.body).length === 0) {
      const defaultFirstName = "User";
      const defaultLastName = "Default";
      const defaultEmail = `user${Date.now()}@example.com`;
      const defaultGender = "other";
      const defaultPassword = "Default@123";
      
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);
      const otp = generateOTP();
      const otpExpiry = Date.now() + 10 * 60 * 1000;

      const user = new User({
        PROFILE_IMG: null,
        first_name: defaultFirstName,
        last_name: defaultLastName,
        email: defaultEmail,
        gender: defaultGender,
        password: hashedPassword,
        address_list: [],
        is_address_list: false,
        verification: {
          user: {
            otp: otp,
            is_verified: false,
            is_expired_time: otpExpiry,
            is_expired_otp: false,
            otp_attempt: 0,
            lock_time: 0,
          },
        },
      });

      await user.save();

      try {
        await sendOTPEmail(defaultEmail, otp, defaultFirstName);
      } catch (emailError) {
        console.error('Email error (non-fatal):', emailError.message);
      }

      return res.status(201).json({
        success: true,
        message: "Empty user created successfully with default values. Please verify OTP.",
        data: {
          user_id: user._id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          gender: user.gender,
          is_verified: user.verification.user.is_verified,
          otp: process.env.NODE_ENV === 'development' ? otp : undefined,
        },
      });
    }

    const emptyFields = [];
    if (!first_name || first_name.trim() === "") emptyFields.push("first_name");
    if (!last_name || last_name.trim() === "") emptyFields.push("last_name");
    if (!email || email.trim() === "") emptyFields.push("email");
    if (!gender || gender.trim() === "") emptyFields.push("gender");
    if (!password || password.trim() === "") emptyFields.push("password");

    if (emptyFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing or empty fields: ${emptyFields.join(", ")}`,
        required_fields: ["first_name", "last_name", "email", "gender", "password"]
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const otp = generateOTP();
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    const user = new User({
      PROFILE_IMG: req.body.PROFILE_IMG || null,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.toLowerCase().trim(),
      gender: gender.toLowerCase(),
      password: hashedPassword,
      address_list: Array.isArray(address_list) ? address_list : [],
      is_address_list: Array.isArray(address_list) && address_list.length > 0,
      verification: {
        user: {
          otp: otp,
          is_verified: false,
          is_expired_time: otpExpiry,
          is_expired_otp: false,
          otp_attempt: 0,
          lock_time: 0,
        },
      },
    });

    await user.save();

    try {
      await sendOTPEmail(email, otp, first_name);
    } catch (emailError) {
      console.error('Email error (non-fatal):', emailError.message);
    }

    res.status(201).json({
      success: true,
      message: "Account created successfully. Please verify OTP.",
      data: {
        user_id: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        gender: user.gender,
        is_verified: user.verification.user.is_verified,
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
      },
    });

  } catch (error) {
    console.error("Create Account Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create account",
      error: error.message,
    });
  }
};

// ============ VERIFY OTP ============
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.verification.user.is_verified) {
      return res.status(400).json({
        success: false,
        message: "Account already verified",
      });
    }

    if (user.verification.user.lock_time && user.verification.user.lock_time > Date.now()) {
      const remainingMinutes = Math.ceil((user.verification.user.lock_time - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        message: `Account is locked. Please try again after ${remainingMinutes} minutes`,
        remaining_minutes: remainingMinutes,
      });
    }

    if (user.verification.user.is_expired_otp || 
        user.verification.user.is_expired_time < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    if (user.verification.user.otp_attempt >= 3) {
      return res.status(429).json({
        success: false,
        message: "Maximum OTP attempts exceeded. Account locked.",
      });
    }

    if (user.verification.user.otp !== parseInt(otp)) {
      user.verification.user.otp_attempt += 1;

      if (user.verification.user.otp_attempt >= 3) {
        const lockDuration = getLockTime(user.verification.user.otp_attempt);
        user.verification.user.lock_time = Date.now() + lockDuration * 60000;
        await user.save();
        return res.status(429).json({
          success: false,
          message: `Too many failed attempts. Account locked for ${lockDuration} minute(s)`,
          lock_duration: lockDuration,
        });
      }

      await user.save();
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
        remaining_attempts: 3 - user.verification.user.otp_attempt,
      });
    }

    user.verification.user.is_verified = true;
    user.verification.user.otp = null;
    user.verification.user.is_expired_otp = true;
    user.verification.user.otp_attempt = 0;
    user.verification.user.lock_time = 0;
    user.is_active = true;

    await uexportser.save();

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: "Account verified successfully",
      data: {
        token,
        user: {
          id: user._id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role,
          is_verified: user.verification.user.is_verified,
        },
      },
    });

  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
      error: error.message,
    });
  }
};

// ============ RESEND OTP ============
 // ✅ Fixed
// ============ RESEND OTP ============
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // rate limit: 30 seconds between resends
    const now = Date.now();
    if (
      user.verification?.user?.is_expired_time &&
      user.verification.user.is_expired_time - 9.5 * 60 * 1000 > now
    ) {
      const wait = Math.ceil(
        (user.verification.user.is_expired_time - 9.5 * 60 * 1000 - now) / 1000
      );
      return res.status(429).json({
        success: false,
        message: `Please wait ${wait}s before requesting another OTP`,
      });
    }

    const otp = generateOTP();
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    user.verification.user.otp = otp;
    user.verification.user.is_expired_time = otpExpiry;
    user.verification.user.is_expired_otp = false;
    user.verification.user.otp_attempt = 0;
    user.verification.user.lock_time = 0;

    await user.save();

    // 🚀 ACTUALLY SEND THE EMAIL
    try {
      await sendOTPEmail(user.email, otp, user.first_name);
      console.log(`✅ OTP resent to ${user.email}`);
    } catch (emailError) {
      console.error("Email error:", emailError.message);
    }

    return res.status(200).json({
      success: true,
      message: "OTP resent successfully",
      otp: process.env.NODE_ENV === "development" ? otp : undefined,
    });
  } catch (err) {
    console.error("Resend OTP Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
      error: err.message,
    });
  }
};
// ============ LOGIN USER ============
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    const user = await User.findOne({ 
      email: email.toLowerCase(),
      is_deleted: false,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive. Please contact support.",
      });
    }

    if (!user.verification.user.is_verified) {
      return res.status(403).json({
        success: false,
        message: "Account not verified. Please verify your email first.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user._id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          gender: user.gender,
          role: user.role,
          is_verified: user.verification.user.is_verified,
          PROFILE_IMG: user.PROFILE_IMG,
          address_list: user.address_list,
        },
      },
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to login",
      error: error.message,
    });
  }
};

// ============ GET PROFILE - COMPLETE DATA ============
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .select("-password -verification.user.otp");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Return full profile data including image URL
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          gender: user.gender,
          role: user.role,
          PROFILE_IMG: user.PROFILE_IMG || null,
          address_list: user.address_list || [],
          is_address_list: user.is_address_list || false,
          is_active: user.is_active,
          is_verified: user.verification?.user?.is_verified || false,
          created_at: user.createdAt,
          updated_at: user.updatedAt,
          // Add full image details if needed
          image_details: user.PROFILE_IMG ? {
            url: user.PROFILE_IMG,
            cloudinary: user.PROFILE_IMG.includes('cloudinary') ? true : false
          } : null
        },
      },
    });

  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: error.message,
    });
  }
};

// ============ UPDATE PROFILE ============
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { first_name, last_name, gender, address_list } = req.body;
    const profileImage = req.file;

    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (first_name) user.first_name = first_name.trim();
    if (last_name) user.last_name = last_name.trim();
    if (gender) user.gender = gender.toLowerCase();
    
    if (address_list) {
      try {
        const parsedAddress = typeof address_list === 'string' ? JSON.parse(address_list) : address_list;
        user.address_list = Array.isArray(parsedAddress) ? parsedAddress : [];
        user.is_address_list = user.address_list.length > 0;
      } catch (e) {
        user.address_list = Array.isArray(address_list) ? address_list : [];
        user.is_address_list = user.address_list.length > 0;
      }
    }

    if (profileImage) {
      try {
        const result = await UploadProfileImg(profileImage.path);
        
        if (user.PROFILE_IMG && user.PROFILE_IMG.includes('cloudinary')) {
          try {
            const oldPublicId = user.PROFILE_IMG.split('/').pop().split('.')[0];
            await DeleteProfileImg(`profile_images/${oldPublicId}`);
          } catch (deleteError) {
            // Ignore deletion errors
          }
        }

        user.PROFILE_IMG = result.secure_url;

        try {
          fs.unlinkSync(profileImage.path);
        } catch (unlinkError) {
          // Ignore file deletion errors
        }

      } catch (uploadError) {
        console.error('Cloudinary Upload Error:', uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload image to Cloudinary",
          error: uploadError.message
        });
      }
    }

    if (user.PROFILE_IMG) {
      user.markModified('PROFILE_IMG');
    }

    await user.save();

    const updatedUser = await User.findById(userId)
      .select("-password -verification.user.otp")
      .lean();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          id: updatedUser._id,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          email: updatedUser.email,
          gender: updatedUser.gender,
          role: updatedUser.role,
          PROFILE_IMG: updatedUser.PROFILE_IMG || null,
          address_list: updatedUser.address_list || [],
          is_address_list: updatedUser.is_address_list || false,
          is_active: updatedUser.is_active,
          is_verified: updatedUser.verification?.user?.is_verified || false,
          created_at: updatedUser.createdAt,
          updated_at: updatedUser.updatedAt,
        },
      },
    });

  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

// ============ ADD ADDRESS ============
export const addAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Address is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.address_list.push(address);
    user.is_address_list = true;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Address added successfully",
      data: {
        address_list: user.address_list,
        total_addresses: user.address_list.length,
      },
    });

  } catch (error) {
    console.error("Add Address Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add address",
      error: error.message,
    });
  }
};

// ============ UPDATE ADDRESS ============
export const updateAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { address_index, address } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (address_index === undefined || address_index === null) {
      return res.status(400).json({
        success: false,
        message: "Address index is required",
      });
    }

    if (!user.address_list[address_index]) {
      return res.status(404).json({
        success: false,
        message: "Address not found at specified index",
      });
    }

    user.address_list[address_index] = address;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: {
        address_list: user.address_list,
      },
    });

  } catch (error) {
    console.error("Update Address Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update address",
      error: error.message,
    });
  }
};

// ============ DELETE ADDRESS ============
export const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { address_index } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (address_index === undefined || address_index === null) {
      return res.status(400).json({
        success: false,
        message: "Address index is required",
      });
    }

    user.address_list.splice(address_index, 1);
    user.is_address_list = user.address_list.length > 0;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      data: {
        address_list: user.address_list,
        total_addresses: user.address_list.length,
      },
    });

  } catch (error) {
    console.error("Delete Address Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete address",
      error: error.message,
    });
  }
};

// ============ CHANGE PASSWORD ============
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password) {
      return res.status(400).json({
        success: false,
        message: "Current password is required",
      });
    }

    if (!new_password) {
      return res.status(400).json({
        success: false,
        message: "New password is required",
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(current_password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(new_password, saltRounds);
    user.password = hashedPassword;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });

  } catch (error) {
    console.error("Change Password Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password",
      error: error.message,
    });
  }
};

// ============ ERROR HANDLING ============
export const allError = (err, req, res, next) => {
  console.error("Error:", err.message);
  
  if (err.name === "ValidationError") {
    return res.status(400).json({ 
      success: false, 
      message: Object.values(err.errors).map(e => e.message).join(", ") 
    });
  }
  
  if (err.code === 11000) {
    return res.status(409).json({ 
      success: false, 
      message: `${Object.keys(err.keyPattern)[0]} already exists` 
    });
  }
  
  if (err.name === "CastError") {
    return res.status(400).json({ 
      success: false, 
      message: `Invalid ${err.path}: ${err.value}` 
    });
  }
  
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ 
      success: false, 
      message: "Invalid token" 
    });
  }
  
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ 
      success: false, 
      message: "Token expired. Please login again." 
    });
  }
  
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ 
      success: false, 
      message: "File size exceeds the limit of 5MB" 
    });
  }
  
  return res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
};