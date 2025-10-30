import express from "express";
import nodemailer from "nodemailer";

const router = express.Router();

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000);
}

router.post("/send", async (req, res) => {
  const { email } = req.body;
  
  console.log('\n========================================');
  console.log('📧 SELLER OTP REQUEST');
  console.log('========================================');
  console.log('Target email:', email);
  console.log('Timestamp:', new Date().toISOString());
  
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      error: "Email is required" 
    });
  }
if (!process.env.EMAIL_FROM || !process.env.EMAIL_PASSWORD) {
    console.error('❌ CRITICAL: Email credentials missing!');
    console.error('   EMAIL_FROM:', process.env.EMAIL_FROM ? '✅ Set' : '❌ Missing');
    console.error('   EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Missing');
    return res.status(500).json({ 
      success: false, 
      error: "Email service not configured. Please contact administrator." 
    });
  }
  
  const otp = generateOTP();
  console.log('🔢 Generated Seller OTP:', otp);
  
  try {
    // ✅ FIXED: Use correct environment variables
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,      // Changed from EMAIL_USER
        pass: process.env.EMAIL_PASSWORD,  // Changed from EMAIL_PASS
      },
    });

    console.log('📬 Using email account:', process.env.EMAIL_FROM);
    console.log('📬 Verifying transporter...');
    
    await transporter.verify();
    console.log('✅ Transporter verified successfully');

    console.log('📧 Sending OTP email...');

    const mailOptions = {
      from: `"TasteSphere Seller Portal" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "TasteSphere Seller Portal - Your OTP Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); border-radius: 12px;">
          <div style="background: white; padding: 30px; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f97316, #ef4444); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 30px;">🏪</span>
              </div>
              <h1 style="color: #f97316; margin: 0; font-size: 28px;">TasteSphere</h1>
              <p style="color: #666; margin: 10px 0 0 0;">Seller Portal - Verification</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #333; margin: 0 0 20px 0;">Your verification code is:</p>
              <div style="font-size: 48px; font-weight: bold; color: #f97316; padding: 20px; background: linear-gradient(135deg, #fff7ed, #ffedd5); border-radius: 12px; letter-spacing: 10px; border: 3px solid #f97316;">
                ${otp}
              </div>
            </div>
            
            <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px; margin: 25px 0; text-align: center;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>🏪 Business Account Security</strong><br>
                This code expires in 5 minutes.<br>
                Never share it with anyone.
              </p>
            </div>
            
            <div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0;">
                For business use only<br>
                <strong>TasteSphere Seller Portal Team</strong>
              </p>
            </div>
          </div>
        </div>
      `,
      text: `Your TasteSphere Seller Portal OTP is: ${otp}. This code will expire in 5 minutes. For business use only. Never share this code with anyone.`
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ OTP EMAIL SENT SUCCESSFULLY!');
    console.log('   Message ID:', info.messageId);
    console.log('   To:', email);
    console.log('   OTP:', otp);
    console.log('========================================\n');
    
    res.json({ 
      success: true, 
      otp,
      message: 'OTP sent successfully to your email'
    });
    
  } catch (err) {
    console.error('❌ SELLER OTP ERROR:', err);
    console.error('   Error Code:', err.code);
    console.error('   Error Message:', err.message);
    
    let errorMessage = "Failed to send OTP. ";
    
    if (err.code === 'EAUTH') {
      errorMessage += "Gmail authentication failed. Please verify your App Password.";
      console.error('💡 Fix: Go to https://myaccount.google.com/apppasswords');
    } else if (err.code === 'ENOTFOUND') {
      errorMessage += "Network connection failed.";
    } else if (err.code === 'ETIMEDOUT') {
      errorMessage += "Connection timed out.";
    } else {
      errorMessage += err.message;
    }
    
    console.error('========================================\n');
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Test endpoint
router.get("/test-config", (req, res) => {
  const isConfigured = !!(process.env.EMAIL_FROM && process.env.EMAIL_PASSWORD);
  
  res.json({
    success: true,
    emailConfigured: isConfigured,
    emailFrom: process.env.EMAIL_FROM ? `${process.env.EMAIL_FROM.slice(0, 3)}***@gmail.com` : 'Not set',
    passwordSet: !!process.env.EMAIL_PASSWORD,
    service: 'gmail'
  });
});

export default router;