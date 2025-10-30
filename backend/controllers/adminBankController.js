// backend/controllers/adminBankController.js
import Seller from '../models/Seller.js';

// Get all sellers with bank details
export const getAllSellerBankDetails = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;

    const query = {};
    
    // Filter by verification status
    if (status === 'verified') {
      query['bankDetails.verifiedAt'] = { $ne: null };
    } else if (status === 'pending') {
      query['bankDetails.verifiedAt'] = null;
      query['bankDetails.accountNumber'] = { $exists: true, $ne: '' };
    }

    // Search by business name or account holder
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { 'bankDetails.accountHolderName': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const sellers = await Seller.find(query)
      .select('businessName email phone bankDetails businessDetails.ownerName isVerified isActive createdAt')
      .sort({ 'bankDetails.verifiedAt': 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Seller.countDocuments(query);

    const sellersWithBankDetails = sellers.map(seller => ({
      id: seller._id,
      businessName: seller.businessName,
      ownerName: seller.businessDetails?.ownerName || 'N/A',
      email: seller.email,
      phone: seller.phone,
      bankDetails: seller.bankDetails ? {
        bankName: seller.bankDetails.bankName,
        accountNumber: seller.bankDetails.accountNumber,
        ifscCode: seller.bankDetails.ifscCode,
        accountHolderName: seller.bankDetails.accountHolderName,
        branchName: seller.bankDetails.branchName,
        verifiedAt: seller.bankDetails.verifiedAt,
        isVerified: !!seller.bankDetails.verifiedAt
      } : null,
      isActive: seller.isActive,
      isVerified: seller.isVerified,
      registeredAt: seller.createdAt
    }));

    res.json({
      success: true,
      data: sellersWithBankDetails,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Get bank details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bank details'
    });
  }
};

// Get single seller bank details
export const getSellerBankDetails = async (req, res) => {
  try {
    const { sellerId } = req.params;

    const seller = await Seller.findById(sellerId)
      .select('businessName email phone bankDetails businessDetails.ownerName isVerified isActive createdAt');

    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: seller._id,
        businessName: seller.businessName,
        ownerName: seller.businessDetails?.ownerName || 'N/A',
        email: seller.email,
        phone: seller.phone,
        bankDetails: seller.bankDetails || null,
        isActive: seller.isActive,
        isVerified: seller.isVerified,
        registeredAt: seller.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Get seller bank details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch seller bank details'
    });
  }
};

// Verify seller bank details
export const verifyBankDetails = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { verified, notes } = req.body;

    const seller = await Seller.findById(sellerId);

    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    if (!seller.bankDetails || !seller.bankDetails.accountNumber) {
      return res.status(400).json({
        success: false,
        error: 'No bank details found for this seller'
      });
    }

    if (verified) {
      seller.bankDetails.verifiedAt = new Date();
      seller.bankDetails.verificationNotes = notes || 'Verified by admin';
    } else {
      seller.bankDetails.verifiedAt = null;
      seller.bankDetails.verificationNotes = notes || 'Verification rejected';
    }

    await seller.save();

    res.json({
      success: true,
      message: verified ? 'Bank details verified successfully' : 'Bank details verification rejected',
      data: {
        bankDetails: seller.bankDetails,
        sellerId: seller._id,
        businessName: seller.businessName
      }
    });
  } catch (error) {
    console.error('❌ Verify bank details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify bank details'
    });
  }
};

// Update seller bank details (admin override)
export const updateSellerBankDetails = async (req, res) => {
  try {
    const { sellerId } = req.params;
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
      verifiedAt: null, // Reset verification when admin updates
      verificationNotes: 'Updated by admin - pending re-verification'
    };

    await seller.save();

    res.json({
      success: true,
      message: 'Bank details updated successfully',
      data: seller.bankDetails
    });
  } catch (error) {
    console.error('❌ Update bank details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update bank details'
    });
  }
};

// Get bank details statistics
export const getBankDetailsStats = async (req, res) => {
  try {
    const totalWithBankDetails = await Seller.countDocuments({
      'bankDetails.accountNumber': { $exists: true, $ne: '' }
    });

    const verified = await Seller.countDocuments({
      'bankDetails.verifiedAt': { $ne: null }
    });

    const pending = await Seller.countDocuments({
      'bankDetails.accountNumber': { $exists: true, $ne: '' },
      'bankDetails.verifiedAt': null
    });

    const totalSellers = await Seller.countDocuments();

    res.json({
      success: true,
      stats: {
        totalSellers,
        totalWithBankDetails,
        verified,
        pending,
        withoutBankDetails: totalSellers - totalWithBankDetails
      }
    });
  } catch (error) {
    console.error('❌ Get bank stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
};