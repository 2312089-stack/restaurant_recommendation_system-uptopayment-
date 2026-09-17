// utils/ensureDefaultAdmin.js - Bootstrap the platform admin from env vars.
// Set ADMIN_EMAIL and ADMIN_PASSWORD in the environment to create/rotate the
// admin account on boot. Without them, admin login stays disabled until an
// admin document is created some other way.
import Admin from '../models/Admin.js';

export const ensureDefaultAdmin = async () => {
  const email = (process.env.ADMIN_EMAIL || '').trim();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || !password) {
    const count = await Admin.countDocuments();
    if (count === 0) {
      console.warn(
        'No admin account configured. Set ADMIN_EMAIL and ADMIN_PASSWORD to enable /admin/login.'
      );
    }
    return;
  }

  let admin = await Admin.findByEmailWithPassword(email);

  if (!admin) {
    admin = await Admin.create({
      name: process.env.ADMIN_NAME || 'Administrator',
      email,
      passwordHash: password
    });
    console.log(`Admin account created for ${admin.email}`);
    return;
  }

  const matches = await admin.comparePassword(password);
  if (!matches) {
    admin.passwordHash = password;
    await admin.save();
    console.log(`Admin password updated for ${admin.email}`);
  }
};

export default ensureDefaultAdmin;
