// utils/sendEmail.js
import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    // Create transporter with timeouts
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    // Send email
    await transporter.sendMail({
      from: `"No-Reply" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text, // optional plain text
      html, // optional HTML content
    });

    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error("Email sending failed:", error.message);
    throw new Error("Email could not be sent");
  }
};

export default sendEmail;
