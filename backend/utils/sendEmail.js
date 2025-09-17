// utils/sendEmail.js
import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
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
