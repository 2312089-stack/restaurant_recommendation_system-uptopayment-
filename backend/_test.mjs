import dotenv from 'dotenv';
dotenv.config();
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'tastesphere369@gmail.com',
    pass: process.env.EMAIL_PASS || 'xgggmyousikbzgzv',
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

console.log('Verifying SMTP connection...');
await transporter.verify();
console.log('SMTP verify OK');

const info = await transporter.sendMail({
  from: `"TasteSphere" <tastesphere369@gmail.com>`,
  to: 'tastesphere369@gmail.com',
  subject: 'TasteSphere SMTP test - port 587',
  text: 'This is a test from port 587 (STARTTLS).',
});
console.log('Email sent:', info.messageId);