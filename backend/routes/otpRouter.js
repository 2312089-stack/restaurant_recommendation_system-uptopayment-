// routes/otpRouter.js
import express from "express";
import { google } from "googleapis";

const router = express.Router();

// Generate 4-digit OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000);
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

// Send OTP via Gmail API
router.post("/send", async (req, res) => {
  const { email } = req.body;

  console.log("📧 OTP Request received for:", email);

  if (!email) {
    return res.status(400).json({ success: false, error: "Email is required" });
  }

  if (!process.env.GMAIL_REFRESH_TOKEN) {
    console.error("❌ GMAIL_REFRESH_TOKEN not set");
    return res.status(500).json({
      success: false,
      error: "Email service not configured. Admin: set GMAIL_REFRESH_TOKEN.",
    });
  }

  const otp = generateOTP();
  console.log("🔢 Generated OTP:", otp);

  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

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

    const raw = buildRawEmail(
      email,
      "TasteSphere - Your OTP Code",
      htmlBody,
      textBody
    );

    await gmail.users.messages.send({
      userId: "me",
      raw,
    });

    console.log("✅ Email sent via Gmail API!");
    console.log("OTP sent to:", email, "OTP:", otp);

    res.json({ success: true, otp });
  } catch (err) {
    console.error("❌ Gmail API Error:", err.message);

    let errorMessage = "Failed to send OTP. ";
    if (err.message?.includes("invalid_grant")) {
      errorMessage += "Refresh token expired. Re-authorize Gmail API.";
    } else {
      errorMessage += err.message;
    }

    res.status(500).json({ success: false, error: errorMessage });
  }
});

export default router;
