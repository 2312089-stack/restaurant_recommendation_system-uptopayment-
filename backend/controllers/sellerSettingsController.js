// backend/controllers/sellerSettingsController.js
import Seller from '../models/Seller.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';

export const getSettings = async (req, res) => {
  try {
    const sellerId = req.seller?.id || req.seller?.sellerId;
    
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        error: 'Seller not authenticated'
      });
    }

    const seller = await Seller.findById(sellerId);
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    // ✅ RETURN BANK DETAILS
    res.json({
      success: true,
      settings: {
        notifications: seller.notificationSettings || {
          email: true,
          sms: true,
          push: true,
          orderAlerts: true,
          paymentAlerts: true,
          reviewAlerts: true
        },
        orderAcceptance: seller.orderAcceptance || {
          auto: false,
          manualTimeout: 15
        },
        businessHours: seller.businessDetails?.openingHours || {},
        // ✅ ADD BANK DETAILS HERE
        bankDetails: seller.bankDetails || {
          bankName: '',
          accountNumber: '',
          ifscCode: '',
          accountHolderName: '',
          branchName: ''
        }
      }
    });

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get settings'
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

export const updateBankDetails = async (req, res) => {
  try {
    const sellerId = req.seller?.id || req.seller?.sellerId;
    const { bankName, accountNumber, ifscCode, accountHolderName, branchName } = req.body;

    console.log('📝 Updating bank details for seller:', sellerId);
    console.log('📝 Bank data:', { bankName, accountNumber, ifscCode, accountHolderName, branchName });

    if (!sellerId) {
      return res.status(401).json({
        success: false,
        error: 'Seller not authenticated'
      });
    }

    // Validation
    if (!bankName || !accountNumber || !ifscCode || !accountHolderName) {
      return res.status(400).json({
        success: false,
        error: 'All required fields must be provided'
      });
    }

    const seller = await Seller.findById(sellerId);
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    // ✅ UPDATE BANK DETAILS
    seller.bankDetails = {
      bankName,
      accountNumber,
      ifscCode: ifscCode.toUpperCase(),
      accountHolderName,
      branchName: branchName || '',
      verifiedAt: null, // Reset verification when updated
      verificationNotes: 'Updated by seller - pending verification'
    };

    await seller.save();

    console.log('✅ Bank details updated successfully for seller:', sellerId);

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