import express from "express";
import userRoutes from "./userRoutes.js";

const router = express.Router();

// ============ HEALTH CHECK ============
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ============ API VERSION ============
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Cloth Server API",
    version: "1.0.0",
    endpoints: {
      users: "/api/users",
      health: "/api/health",
    },
  });
});

// ============ USER ROUTES ============
router.use("/users", userRoutes);

export default router;