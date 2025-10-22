// utils/emailService.js
import nodemailer from 'nodemailer';

// Create reusable transporter
let transporter = null;

const initializeTransporter = () => {
  if (transporter) return transporter;

  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('⚠️  Email service not configured (EMAIL_USER or EMAIL_PASS missing)');
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    console.log('✅ Email service initialized');
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
    // Email to customer (confirmation)
    const customerMailOptions = {
      from: `"TasteSphere Support" <${process.env.EMAIL_USER}>`,
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
            .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
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
                Thank you for reaching out to us! We've received your message and our team will respond within <strong>2-3 minutes</strong>.
              </p>

              <div class="info-box">
                <h3>Your Message Details:</h3>
                <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                ${phone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${phone}</p>` : ''}
                <p style="margin: 10px 0 0 0;"><strong>Message:</strong></p>
                <p style="background-color: white; padding: 15px; border-radius: 4px; margin: 5px 0 0 0;">${message}</p>
              </div>

              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Need immediate assistance? You can also:
              </p>
              <ul style="color: #666; font-size: 16px; line-height: 1.8;">
                <li>📞 Call us: <strong>+91 84288 17940</strong> (24/7)</li>
                <li>💬 Live Chat on our website</li>
                <li>📧 Reply to this email</li>
              </ul>
            </div>

            <div class="footer">
              <p style="color: #999; font-size: 14px; margin: 5px 0;">
                TasteSphere - Your Favorite Food, Delivered<br>
                Tirunelveli, Tamil Nadu, India
              </p>
              <p style="color: #999; font-size: 12px; margin: 15px 0 0 0;">
                © ${new Date().getFullYear()} TasteSphere. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Email to admin/support team
    const adminMailOptions = {
      from: `"TasteSphere Contact Form" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: `🔔 New Contact Form: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ff6b35; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .field { margin: 15px 0; padding: 10px; background-color: white; border-left: 4px solid #ff6b35; }
            .field strong { color: #ff6b35; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">🔔 New Contact Form Submission</h2>
            </div>
            <div class="content">
              <div class="field">
                <strong>From:</strong> ${name}
              </div>
              <div class="field">
                <strong>Email:</strong> <a href="mailto:${email}">${email}</a>
              </div>
              ${phone ? `
                <div class="field">
                  <strong>Phone:</strong> <a href="tel:${phone}">${phone}</a>
                </div>
              ` : ''}
              <div class="field">
                <strong>Subject:</strong> ${subject}
              </div>
              <div class="field">
                <strong>Message:</strong><br><br>
                ${message.replace(/\n/g, '<br>')}
              </div>
              <div class="field">
                <strong>Submitted:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </div>
              <p style="margin-top: 20px; color: #666;">
                <strong>⏰ Action Required:</strong> Please respond within 2-3 minutes
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Send both emails
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

    // Email to customer
    const customerMailOptions = {
      from: `"TasteSphere Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Ticket Created: ${ticketNumber} - ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { padding: 40px 30px; }
            .ticket-box { background-color: #f0fdf4; border: 2px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
            .ticket-number { font-size: 24px; font-weight: bold; color: #10b981; margin: 10px 0; }
            .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e0e0e0; }
            .footer { background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎫 Support Ticket Created</h1>
            </div>
            
            <div class="content">
              <h2 style="color: #333;">Hi ${name}! 👋</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Your support ticket has been created successfully. Our team will respond shortly.
              </p>

              <div class="ticket-box">
                <p style="margin: 0; color: #666;">Your Ticket Number</p>
                <div class="ticket-number">${ticketNumber}</div>
                <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Please save this for your records</p>
              </div>

              <div style="margin: 30px 0;">
                <div class="info-row">
                  <span style="color: #666;"><strong>Subject:</strong></span>
                  <span style="color: #333;">${subject}</span>
                </div>
                <div class="info-row">
                  <span style="color: #666;"><strong>Category:</strong></span>
                  <span style="color: #333; text-transform: capitalize;">${category.replace('-', ' ')}</span>
                </div>
                <div class="info-row" style="border-bottom: none;">
                  <span style="color: #666;"><strong>Priority:</strong></span>
                  <span style="color: ${priorityColors[priority]}; font-weight: bold;">
                    ${priorityEmojis[priority]} ${priority.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div class="footer">
              <p style="color: #999; font-size: 14px; margin: 5px 0;">
                TasteSphere Support Team<br>
                Tirunelveli, Tamil Nadu, India
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Email to admin
    const adminMailOptions = {
      from: `"TasteSphere Tickets" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: `🎫 New Support Ticket: ${ticketNumber} [${priority.toUpperCase()}]`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #ff6b35;">🎫 New Support Ticket</h2>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
            <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
            <p><strong>From:</strong> ${name} (${email})</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Category:</strong> ${category}</p>
            <p><strong>Priority:</strong> <span style="color: ${priorityColors[priority]}; font-weight: bold;">${priorityEmojis[priority]} ${priority.toUpperCase()}</span></p>
            <p><strong>Created:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
          </div>
        </body>
        </html>
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