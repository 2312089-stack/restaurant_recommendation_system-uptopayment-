// backend/controllers/sellerSettingsController.js
import Seller from '../models/Seller.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';

// Get seller settings
export const getSettings = async (req, res) => {
  try {
    const sellerId = req.seller.id;
    
    const seller = await Seller.findById(sellerId).select('-passwordHash');
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    res.json({
      success: true,
      settings: {
        notifications: seller.settings?.notifications || {
          email: true,
          sms: true,
          push: true,
          orderAlerts: true,
          paymentAlerts: true,
          reviewAlerts: true
        },
        orderAcceptance: seller.settings?.orderAcceptance || {
          auto: false,
          manualTimeout: 15
        },
        businessHours: seller.businessDetails?.openingHours || {}
      }
    });
  } catch (error) {
    console.error('❌ Get settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
};

// Update notification settings
export const updateNotificationSettings = async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const { email, sms, push, orderAlerts, paymentAlerts, reviewAlerts } = req.body;

    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    seller.settings = seller.settings || {};
    seller.settings.notifications = {
      email: email !== undefined ? email : true,
      sms: sms !== undefined ? sms : true,
      push: push !== undefined ? push : true,
      orderAlerts: orderAlerts !== undefined ? orderAlerts : true,
      paymentAlerts: paymentAlerts !== undefined ? paymentAlerts : true,
      reviewAlerts: reviewAlerts !== undefined ? reviewAlerts : true
    };

    await seller.save();

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      settings: seller.settings.notifications
    });
  } catch (error) {
    console.error('❌ Update notification settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters'
      });
    }

    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, seller.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    seller.passwordHash = hashedPassword;
    seller.passwordChangedAt = new Date();
    await seller.save();

    // Send email notification
    try {
      await sendEmail({
        to: seller.email,
        subject: 'Password Changed - TasteSphere Seller',
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Password Changed Successfully</h2>
            <p>Your password has been changed on ${new Date().toLocaleString()}.</p>
            <p>If you didn't make this change, please contact support immediately.</p>
          </div>
        `
      });
    } catch (emailError) {
      console.warn('⚠️ Email notification failed:', emailError);
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
};

// Update bank details
export const updateBankDetails = async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const { bankName, accountNumber, ifscCode, accountHolderName, branchName } = req.body;

    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    seller.bankDetails = {
      bankName,
      accountNumber,
      ifscCode,
      accountHolderName,
      branchName,
      verifiedAt: null // Requires admin verification
    };

    await seller.save();

    res.json({
      success: true,
      message: 'Bank details updated successfully. Verification pending.',
      bankDetails: seller.bankDetails
    });
  } catch (error) {
    console.error('❌ Update bank details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update bank details'
    });
  }
};

// Update business hours
export const updateBusinessHours = async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const { openingHours } = req.body;

    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    seller.businessDetails = seller.businessDetails || {};
    seller.businessDetails.openingHours = openingHours;

    await seller.save();

    res.json({
      success: true,
      message: 'Business hours updated successfully',
      openingHours: seller.businessDetails.openingHours
    });
  } catch (error) {
    console.error('❌ Update business hours error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update business hours'
    });
  }
};