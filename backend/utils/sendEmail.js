// backend/utils/sendEmail.js - Complete Email Utility
import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    // Validate environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ EMAIL_USER or EMAIL_PASS not configured in .env');
      throw new Error('Email configuration missing');
    }

    console.log('📧 Preparing to send email to:', to);
    console.log('📧 Subject:', subject);

    // Create transporter with Gmail
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      // Enable debugging in development
      logger: process.env.NODE_ENV === 'development',
      debug: process.env.NODE_ENV === 'development'
    });

    // Verify transporter connection
    try {
      await transporter.verify();
      console.log('✅ Email transporter verified successfully');
    } catch (verifyError) {
      console.error('❌ Email transporter verification failed:', verifyError.message);
      throw verifyError;
    }

    // Email options
    const mailOptions = {
      from: `"TasteSphere" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: text || 'Please enable HTML to view this email',
      html: html || text
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);

    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    
    // Detailed error logging for debugging
    if (error.code === 'EAUTH') {
      console.error('❌ Gmail authentication failed. Please check:');
      console.error('   1. EMAIL_USER is your Gmail address');
      console.error('   2. EMAIL_PASS is an App Password (NOT your regular password)');
      console.error('   3. 2-Step Verification is enabled in your Gmail account');
      console.error('   4. Generate App Password at: https://myaccount.google.com/apppasswords');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.error('❌ Connection failed. Check your internet connection.');
    } else if (error.code === 'EENVELOPE') {
      console.error('❌ Invalid email address:', to);
    }
    
    // Return error instead of throwing to prevent order failure
    return {
      success: false,
      error: error.message
    };
  }
};

export default sendEmail;