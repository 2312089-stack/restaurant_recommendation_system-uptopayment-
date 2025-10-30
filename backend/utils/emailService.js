import nodemailer from 'nodemailer';

let transporter = null;

const initializeTransporter = () => {
  if (transporter) return transporter;

  // ✅ FIXED: Check correct environment variables
  if (!process.env.EMAIL_FROM || !process.env.EMAIL_PASSWORD) {
    console.log('⚠️  Email service not configured');
    console.log('   EMAIL_FROM:', process.env.EMAIL_FROM ? 'Set ✅' : 'Missing ❌');
    console.log('   EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'Set ✅' : 'Missing ❌');
    return null;
  }

  try {
    // ✅ FIXED: Use correct environment variables
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,      // Changed from EMAIL_USER
        pass: process.env.EMAIL_PASSWORD   // Changed from EMAIL_PASS
      }
    });

    console.log('✅ Email service initialized with:', process.env.EMAIL_FROM);
    return transporter;
  } catch (error) {
    console.error('❌ Failed to initialize email service:', error.message);
    return null;
  }
};

// ===================== CONTACT FORM EMAILS =====================
export const sendContactFormEmails = async ({ name, email, phone, subject, message }) => {
  const emailTransporter = initializeTransporter();
  
  if (!emailTransporter) {
    console.log('⚠️  Skipping email (service not configured)');
    return { success: false, message: 'Email service not configured' };
  }

  try {
    // ✅ FIXED: Use EMAIL_FROM instead of EMAIL_USER
    const customerMailOptions = {
      from: `"TasteSphere Support" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: '✅ We Received Your Message - TasteSphere',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { padding: 40px 30px; }
            .info-box { background-color: #fff7ed; border-left: 4px solid #ff6b35; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .info-box h3 { margin: 0 0 10px 0; color: #ff6b35; }
            .footer { background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍽️ TasteSphere</h1>
            </div>
            <div class="content">
              <h2 style="color: #333;">Hi ${name}! 👋</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Thank you for reaching out! We've received your message and will respond within <strong>2-3 minutes</strong>.
              </p>
              <div class="info-box">
                <h3>Your Message Details:</h3>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Email:</strong> ${email}</p>
                ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
                <p><strong>Message:</strong></p>
                <p style="background: white; padding: 15px; border-radius: 4px;">${message}</p>
              </div>
            </div>
            <div class="footer">
              <p style="color: #999; font-size: 14px;">
                TasteSphere - Your Favorite Food, Delivered<br>
                © ${new Date().getFullYear()} TasteSphere. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const adminMailOptions = {
      from: `"TasteSphere Contact Form" <${process.env.EMAIL_FROM}>`,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_FROM,
      subject: `🔔 New Contact Form: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #ff6b35;">🔔 New Contact Form Submission</h2>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
            <p><strong>From:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong><br>${message.replace(/\n/g, '<br>')}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
          </div>
        </body>
        </html>
      `
    };

    await Promise.all([
      emailTransporter.sendMail(customerMailOptions),
      emailTransporter.sendMail(adminMailOptions)
    ]);

    console.log('✅ Contact form emails sent successfully');
    return { success: true, message: 'Emails sent successfully' };
  } catch (error) {
    console.error('❌ Failed to send contact form emails:', error.message);
    return { success: false, message: error.message };
  }
};

// ===================== SUPPORT TICKET EMAILS =====================
export const sendTicketCreatedEmail = async ({ name, email, subject, category, priority, ticketNumber }) => {
  const emailTransporter = initializeTransporter();
  
  if (!emailTransporter) {
    console.log('⚠️  Skipping email (service not configured)');
    return { success: false, message: 'Email service not configured' };
  }

  try {
    const priorityColors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      urgent: '#dc2626'
    };

    const priorityEmojis = {
      low: '🟢',
      medium: '🟡',
      high: '🔴',
      urgent: '🚨'
    };

    const customerMailOptions = {
      from: `"TasteSphere Support" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: `Ticket Created: ${ticketNumber} - ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { padding: 40px 30px; }
            .ticket-box { background: #f0fdf4; border: 2px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
            .ticket-number { font-size: 24px; font-weight: bold; color: #10b981; margin: 10px 0; }
            .footer { background: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎫 Support Ticket Created</h1>
            </div>
            <div class="content">
              <h2>Hi ${name}! 👋</h2>
              <p>Your support ticket has been created successfully.</p>
              <div class="ticket-box">
                <p style="margin: 0; color: #666;">Your Ticket Number</p>
                <div class="ticket-number">${ticketNumber}</div>
              </div>
              <p><strong>Subject:</strong> ${subject}</p>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Priority:</strong> <span style="color: ${priorityColors[priority]};">${priorityEmojis[priority]} ${priority.toUpperCase()}</span></p>
            </div>
            <div class="footer">
              <p style="color: #999; font-size: 14px;">
                TasteSphere Support Team<br>
                © ${new Date().getFullYear()} TasteSphere
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const adminMailOptions = {
      from: `"TasteSphere Tickets" <${process.env.EMAIL_FROM}>`,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_FROM,
      subject: `🎫 New Support Ticket: ${ticketNumber} [${priority.toUpperCase()}]`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #ff6b35;">🎫 New Support Ticket</h2>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
            <p><strong>Ticket:</strong> ${ticketNumber}</p>
            <p><strong>From:</strong> ${name} (${email})</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Category:</strong> ${category}</p>
            <p><strong>Priority:</strong> <span style="color: ${priorityColors[priority]};">${priorityEmojis[priority]} ${priority.toUpperCase()}</span></p>
            <p><strong>Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
          </div>
        </div>
      `
    };

    await Promise.all([
      emailTransporter.sendMail(customerMailOptions),
      emailTransporter.sendMail(adminMailOptions)
    ]);

    console.log('✅ Ticket creation emails sent successfully');
    return { success: true, message: 'Emails sent successfully' };
  } catch (error) {
    console.error('❌ Failed to send ticket emails:', error.message);
    return { success: false, message: error.message };
  }
};

export default {
  sendContactFormEmails,
  sendTicketCreatedEmail
};