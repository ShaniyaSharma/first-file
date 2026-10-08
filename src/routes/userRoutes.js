import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import {
  createAccount,
  verifyOTP,
  resendOTP,
  loginUser,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  getProfile,
  changePassword,
} from "../controllers/userController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ============ MULTER CONFIGURATION ============
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed!"), false);
};

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter,
});

// ============ PUBLIC ROUTES ============
router.post("/register", createAccount);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/login", loginUser);

// ============ PROTECTED ROUTES ============
router.get("/profile", authMiddleware, getProfile);

// Update profile with image upload (form-data)
router.put(
  "/profile",
  authMiddleware,
  upload.single("profileImage"),
  updateProfile
);

// Update profile without image (JSON only)
router.put("/profile-json", authMiddleware, updateProfile);

// Address routes
router.post("/address", authMiddleware, addAddress);
router.put("/address", authMiddleware, updateAddress);
router.delete("/address", authMiddleware, deleteAddress);

// Security
router.post("/change-password", authMiddleware, changePassword);

export default router;