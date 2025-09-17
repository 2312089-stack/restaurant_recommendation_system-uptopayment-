import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  emailId: { type: String, required: true },
  otp: { type: String, required: true },
  otpExpiry: { type: Date, required: true }
}, { timestamps: true });

const Otp = mongoose.model("Otp", otpSchema);
export default Otp;
