// routes/otpRouter.js
import express from "express";
import nodemailer from "nodemailer";

const router = express.Router();

// Generate 4-digit OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000);
}

router.post("/send", async (req, res) => {
  const { email } = req.body;
  
  console.log('📧 OTP Request received for:', email);
  
  if (!email) {
    return res.status(400).json({ success: false, error: "Email is required" });
  }

  // Check environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ Missing email credentials');
    return res.status(500).json({ 
      success: false, 
      error: "Email service not configured" 
    });
  }
  
  const otp = generateOTP();
  console.log('🔢 Generated OTP:', otp);
  
  try {
    // FIXED: Use createTransport (not createTransporter)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log('📬 Verifying transporter...');
    
    // Verify transporter
    await transporter.verify();
    console.log('✅ Transporter verified successfully');

    console.log('📬 Sending email...');

    // Send email
    const mailOptions = {
      from: `"TasteSphere" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "TasteSphere - Your OTP Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center;">
            <h2 style="color: #f97316; margin: 0;">TasteSphere</h2>
            <p style="color: #666; margin: 10px 0;">Your verification code</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #333; margin: 0 0 10px 0;">Your OTP code is:</p>
            <div style="font-size: 36px; font-weight: bold; color: #f97316; text-align: center; padding: 15px; background: white; border-radius: 8px; letter-spacing: 5px; border: 2px solid #f97316;">
              ${otp}
            </div>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center; margin: 0;">
            This code will expire in 5 minutes.<br>
            Don't share this code with anyone.
          </p>
        </div>
      `,
      text: `Your TasteSphere OTP is: ${otp}. This code will expire in 5 minutes.`
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('OTP sent to:', email, 'OTP:', otp);
    
    res.json({ success: true, otp });
    
  } catch (err) {
    console.error('❌ Detailed Mail Error:', err);
    
    let errorMessage = "Failed to send OTP. ";
    
    if (err.code === 'EAUTH') {
      errorMessage += "Gmail authentication failed. Check your App Password.";
    } else if (err.code === 'ENOTFOUND') {
      errorMessage += "Network connection failed.";
    } else {
      errorMessage += err.message;
    }
    
    res.status(500).json({ success: false, error: errorMessage });
  }
});

export default router;