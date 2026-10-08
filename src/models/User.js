import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    PROFILE_IMG: {
      type: String,
      default: null,
    },
    first_name: {
      type: String,
      required: true,
      trim: true,
    },
    last_name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    password: {
      type: String,
      required: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    address_list: {
      type: Array,
      default: [],
    },
    is_address_list: {
      type: Boolean,
      default: false,
    },
    verification: {
      user: {
        otp: { type: Number, default: null },
        is_verified: { type: Boolean, default: false },
        is_expired_time: { type: Number, default: null },
        is_expired_otp: { type: Boolean, default: false },
        otp_attempt: { type: Number, default: 0 },
        lock_time: { type: Number, default: 0 },
      },
    },
    order_list: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    cart_list: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cart",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);