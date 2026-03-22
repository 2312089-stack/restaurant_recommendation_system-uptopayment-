import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env.js';

export const registerUser = async (req, res) => {
  try {
    const { emailId, password, name } = req.body;
    
    const cleanEmail = emailId ? emailId.trim().toLowerCase() : '';
    
    if (!cleanEmail || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
    }

    const existingUser = await User.findOne({ emailId: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      emailId: cleanEmail,
      passwordHash,
      name
    });

    await newUser.save();

    res.status(201).json({ success: true, message: 'Account created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { emailId, password } = req.body;
    
    const cleanEmail = emailId ? emailId.trim().toLowerCase() : '';
    const user = await User.findOne({ emailId: cleanEmail }).select('+passwordHash');

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, userId: user._id, emailId: user.emailId },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        emailId: user.emailId,
        name: user.name,
        onboardingCompleted: user.onboardingCompleted
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateOnboarding = async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { preferences, onboardingCompleted: true },
      { new: true }
    );

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export default {
  registerUser,
  loginUser,
  updateOnboarding
};
