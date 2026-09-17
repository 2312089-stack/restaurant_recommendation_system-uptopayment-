// routes/otpRouter.js
import express from "express";
import { google } from "googleapis";
import Otp from "../models/otp.js";

const router = express.Router();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Generate 4-digit OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Normalize + validate an email coming from the request
function normalizeEmail(value) {
  if (typeof value !== "string") return null;
  const clean = value.trim().toLowerCase();
  return EMAIL_REGEX.test(clean) ? clean : null;
}

// Gmail OAuth2 client setup
function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BACKEND_URL || 'https://tastesphere-hy30.onrender.com'}/api/otp/gmail-callback`
  );
}

// One-time setup: get authorization URL
router.get("/gmail-auth-url", (req, res) => {
  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.send"],
    prompt: "consent",
  });
  res.json({ success: true, url });
});

// One-time setup: exchange authorization code for refresh token
router.get("/gmail-callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send("Missing authorization code");
  }
  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    res.send(`
      <html><body style="font-family:Arial;max-width:600px;margin:40px auto;padding:20px;">
        <h2>✅ Gmail API Connected!</h2>
        <p><b>Refresh Token:</b></p>
        <textarea style="width:100%;height:60px;font-size:14px;">${tokens.refresh_token}</textarea>
        <p>Copy this token and add it as <code>GMAIL_REFRESH_TOKEN</code> in your Render environment.</p>
      </body></html>
    `);
  } catch (err) {
    console.error("Gmail OAuth error:", err.message);
    res.status(500).send("OAuth error: " + err.message);
  }
});

// Helper: build raw MIME email
function buildRawEmail(to, subject, htmlBody, textBody) {
  const boundary = "----=_Part_" + Date.now();
  const raw = [
    `From: "TasteSphere" <${process.env.EMAIL_USER}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    "",
    textBody,
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    "",
    htmlBody,
    "",
    `--${boundary}--`,
  ].join("\r\n");
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Build OTP email bodies
function buildOtpBody(otp) {
  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;">
        <h2 style="color:#f97316;margin:0;">TasteSphere</h2>
        <p style="color:#666;margin:10px 0;">Your verification code</p>
      </div>
      <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0;">
        <p style="color:#333;margin:0 0 10px 0;">Your OTP code is:</p>
        <div style="font-size:36px;font-weight:bold;color:#f97316;text-align:center;padding:15px;background:white;border-radius:8px;letter-spacing:5px;border:2px solid #f97316;">${otp}</div>
      </div>
      <p style="color:#666;font-size:14px;text-align:center;margin:0;">
        This code will expire in 5 minutes.<br>Don't share this code with anyone.
      </p>
    </div>`;
  const textBody = `Your TasteSphere OTP is: ${otp}. This code will expire in 5 minutes.`;
  return { htmlBody, textBody };
}

// Send the OTP to the requesting user (Gmail API, then SMTP fallback)
async function deliverOtp(recipient, otp, { htmlBody, textBody }) {
  if (process.env.GMAIL_REFRESH_TOKEN) {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const raw = buildRawEmail(
      recipient,
      "TasteSphere - Your OTP Code",
      htmlBody,
      textBody
    );
    await gmail.users.messages.send({ userId: "me", raw });
    return;
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email service not configured");
  }

  const nodemailer = (await import("nodemailer")).default;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  await transporter.sendMail({
    from: `"TasteSphere" <${process.env.EMAIL_USER}>`,
    to: recipient,
    subject: "TasteSphere - Your OTP Code",
    html: htmlBody,
    text: textBody,
  });
}

// Send OTP to the user's own email address
router.post("/send", async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!email) {
    return res.status(400).json({ success: false, error: "A valid email is required" });
  }

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + OTP_TTL_MS);

  try {
    // Store/overwrite the OTP for THIS email only
    await Otp.findOneAndUpdate(
      { emailId: email },
      { emailId: email, otp, otpExpiry },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const { htmlBody, textBody } = buildOtpBody(otp);
    await deliverOtp(email, otp, { htmlBody, textBody });

    console.log("✅ OTP email sent to:", email);
    // Never return or log the OTP itself
    return res.json({ success: true, message: "OTP sent to your email" });
  } catch (err) {
    console.error("❌ Failed to send OTP to", email, "-", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to send OTP. Please try again.",
    });
  }
});

// Verify the OTP for a given email
router.post("/verify", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const submitted = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";

  if (!email || !/^\d{4}$/.test(submitted)) {
    return res.status(400).json({ success: false, error: "Email and 4-digit OTP are required" });
  }

  try {
    const record = await Otp.findOne({ emailId: email });

    if (!record) {
      return res.status(400).json({ success: false, error: "Please request a new OTP" });
    }

    if (record.otpExpiry.getTime() < Date.now()) {
      await Otp.deleteOne({ _id: record._id });
      return res.status(400).json({ success: false, error: "OTP expired. Please request a new one" });
    }

    if (record.otp !== submitted) {
      return res.status(400).json({ success: false, error: "Invalid OTP. Please try again" });
    }

    // Consume the OTP so it cannot be reused
    await Otp.deleteOne({ _id: record._id });
    return res.json({ success: true, message: "OTP verified" });
  } catch (err) {
    console.error("❌ OTP verification error:", err.message);
    return res.status(500).json({ success: false, error: "Verification failed. Please try again" });
  }
});

export default router;
