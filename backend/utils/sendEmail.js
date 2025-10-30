import nodemailer from 'nodemailer';

/**
 * Send email utility function
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @param {string} options.text - Email plain text content (optional)
 * @returns {Promise<Object>} - { success: boolean, error?: string }
 */
const sendEmail = async ({ to, subject, html, text }) => {
  // ✅ FIXED: Check correct environment variables
  if (!process.env.EMAIL_FROM || !process.env.EMAIL_PASSWORD) {
    console.error('❌ Email service not configured');
    console.error('   EMAIL_FROM:', process.env.EMAIL_FROM ? 'Set ✅' : 'Missing ❌');
    console.error('   EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'Set ✅' : 'Missing ❌');
    return { 
      success: false, 
      error: 'Email service not configured. Please contact administrator.' 
    };
  }

  try {
    // ✅ FIXED: Create transporter with correct env vars
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,      // Changed from EMAIL_USER
        pass: process.env.EMAIL_PASSWORD   // Changed from EMAIL_PASS
      }
    });

    // Verify transporter connection
    await transporter.verify();
    console.log('✅ Email transporter verified');

    // Send email
    const info = await transporter.sendMail({
      from: `"TasteSphere" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      text: text || '',
      html
    });

    console.log('✅ Email sent successfully:', info.messageId);
    console.log('   To:', to);
    console.log('   Subject:', subject);

    return { 
      success: true, 
      messageId: info.messageId 
    };

  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    console.error('   Error code:', error.code);
    
    if (error.code === 'EAUTH') {
      console.error('   💡 Fix: Check your Gmail App Password at https://myaccount.google.com/apppasswords');
    }

    return { 
      success: false, 
      error: error.message || 'Failed to send email' 
    };
  }
};

export default sendEmail;