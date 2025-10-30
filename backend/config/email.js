import nodemailer from "nodemailer";

console.log('🔧 Email Config: Checking environment variables...');
console.log('📧 EMAIL_FROM:', process.env.EMAIL_FROM ? '✅ Set' : '❌ Missing');
console.log('🔐 EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Missing');

const transporter = nodemailer.createTransporter({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_FROM,      // ✅ FIXED
    pass: process.env.EMAIL_PASSWORD   // ✅ FIXED
  }
});

// Verify on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email Config Error:', error.message);
  } else {
    console.log('✅ Email service ready:', process.env.EMAIL_FROM);
  }
});

export default transporter;