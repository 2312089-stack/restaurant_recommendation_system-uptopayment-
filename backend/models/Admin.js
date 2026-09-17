// models/Admin.js - Platform administrator account
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    default: 'Administrator'
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    enum: ['admin'],
    default: 'admin'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

adminSchema.index({ email: 1 });

adminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

adminSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email: String(email).toLowerCase().trim() }).select('+passwordHash');
};

adminSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  if (this.passwordHash.startsWith('$2')) return next();

  try {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    next();
  } catch (error) {
    next(error);
  }
});

adminSchema.methods.toJSON = function () {
  const admin = this.toObject();
  delete admin.passwordHash;
  delete admin.__v;
  return admin;
};

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
