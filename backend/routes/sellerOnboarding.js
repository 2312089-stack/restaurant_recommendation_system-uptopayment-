// routes/sellerOnboarding.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import Seller from '../models/Seller.js';

const router = express.Router();

// ✅ FIXED: Use the same JWT_SECRET as sellerAuthController.js
const JWT_SECRET = process.env.JWT_SECRET || 'tastesphere-super-secret-jwt-key-2024-make-this-very-long-and-random-for-security';

// Create uploads directory if it doesn't exist
const uploadsDir = './uploads/sellers';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const sellerId = req.sellerId;
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const fieldName = file.fieldname;
    
    cb(null, `${sellerId}_${fieldName}_${timestamp}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images and PDFs
  const allowedTypes = /jpeg|jpg|png|gif|pdf/;
  const extension = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedTypes.test(file.mimetype);
  
  if (extension && mimeType) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Middleware to authenticate seller
const authenticateSeller = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    console.log('🔍 Verifying seller token...');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token decoded:', decoded);
    
    const seller = await Seller.findById(decoded.sellerId);

    if (!seller) {
      console.log('❌ Seller not found for ID:', decoded.sellerId);
      return res.status(401).json({
        success: false,
        error: 'Invalid token - seller not found'
      });
    }

    req.sellerId = seller._id;
    req.seller = seller;
    console.log('✅ Seller authenticated:', seller.email);
    next();
  } catch (error) {
    console.error('❌ Auth error:', error.message);
    res.status(401).json({
      success: false,
      error: 'Invalid token: ' + error.message
    });
  }
};

// ==================== COMPLETE ONBOARDING ====================
router.post('/complete', authenticateSeller, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'bannerImage', maxCount: 1 },
  { name: 'ownerIdProof', maxCount: 1 },
  { name: 'businessProof', maxCount: 1 }
]), async (req, res) => {
  try {
    const seller = req.seller;
    const {
      restaurantName,
      ownerName,
      businessType,
      description,
      address,
      pincode,
      latitude,
      longitude,
      phoneNumber,
      emailAddress,
      openingHours,
      bankAccount,
      ifscCode,
      accountHolder,
      panNumber,
      gstNumber,
      razorpayId,
      termsAccepted
    } = req.body;

    console.log('📝 Processing onboarding completion for seller:', seller.email);

    // Validate required fields
    const errors = {};
    
    if (!restaurantName) errors.restaurantName = 'Restaurant name is required';
    if (!ownerName) errors.ownerName = 'Owner name is required';
    if (!businessType) errors.businessType = 'Business type is required';
    if (!address) errors.address = 'Address is required';
    if (!pincode) errors.pincode = 'Pincode is required';
    if (!phoneNumber) errors.phoneNumber = 'Phone number is required';
    if (!bankAccount) errors.bankAccount = 'Bank account is required';
    if (!ifscCode) errors.ifscCode = 'IFSC code is required';
    if (!accountHolder) errors.accountHolder = 'Account holder name is required';
    if (!req.files?.ownerIdProof) errors.ownerIdProof = 'Owner ID proof is required';
    if (!req.files?.businessProof) errors.businessProof = 'Business proof is required';
    if (!termsAccepted) errors.termsAccepted = 'Please accept terms and conditions';

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors
      });
    }

    // Parse JSON fields
    let parsedOpeningHours = {};

    try {
      if (openingHours) {
        parsedOpeningHours = typeof openingHours === 'string' ? JSON.parse(openingHours) : openingHours;
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON data format'
      });
    }

    // Process uploaded files
    const fileUrls = {};
    if (req.files) {
      Object.keys(req.files).forEach(fieldName => {
        const file = req.files[fieldName][0];
        fileUrls[fieldName] = `/uploads/sellers/${file.filename}`;
      });
    }

    // Update seller with onboarding data
    const updateData = {
      businessName: restaurantName,
      businessType,
      phone: phoneNumber,
      
      // Address information
      address: {
        street: address,
        zipCode: pincode,
        coordinates: {
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null
        }
      },
      
      // Business details
      businessDetails: {
        ownerName,
        description,
        openingHours: parsedOpeningHours,
        
        // Financial information
        banking: {
          accountNumber: bankAccount,
          ifscCode,
          accountHolder,
          panNumber,
          gstNumber,
          razorpayId
        },
        
        // Uploaded documents and images
        documents: {
          logo: fileUrls.logo,
          bannerImage: fileUrls.bannerImage,
          ownerIdProof: fileUrls.ownerIdProof,
          businessProof: fileUrls.businessProof
        }
      },
      
      // Mark onboarding as completed
      onboardingCompleted: true,
      
      // Update verification status (can be manually reviewed later)
      isVerified: false // Will be verified by admin
    };

    // Update the seller document
    const updatedSeller = await Seller.findByIdAndUpdate(
      seller._id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedSeller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    console.log('✅ Seller onboarding completed successfully for:', seller.email);

    res.json({
      success: true,
      message: 'Onboarding completed successfully! Your application is under review.',
      seller: {
        id: updatedSeller._id,
        email: updatedSeller.email,
        businessName: updatedSeller.businessName,
        businessType: updatedSeller.businessType,
        isVerified: updatedSeller.isVerified,
        onboardingCompleted: updatedSeller.onboardingCompleted
      }
    });

  } catch (error) {
    console.error('❌ Seller onboarding error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      Object.values(req.files).forEach(fileArray => {
        fileArray.forEach(file => {
          fs.unlink(file.path, (unlinkError) => {
            if (unlinkError) console.error('File cleanup error:', unlinkError);
          });
        });
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to complete onboarding'
    });
  }
});

// ==================== GET ONBOARDING STATUS ====================
router.get('/status', authenticateSeller, async (req, res) => {
  try {
    const seller = req.seller;

    res.json({
      success: true,
      onboarding: {
        completed: seller.onboardingCompleted,
        verified: seller.isVerified,
        businessName: seller.businessName,
        businessType: seller.businessType,
        steps: {
          businessProfile: !!(seller.businessName && seller.businessDetails?.ownerName),
          locationContact: !!(seller.address?.street && seller.phone),
          paymentsFinance: !!(seller.businessDetails?.banking?.accountNumber),
          verification: !!(seller.businessDetails?.documents?.ownerIdProof && seller.businessDetails?.documents?.businessProof)
        }
      }
    });

  } catch (error) {
    console.error('❌ Get onboarding status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get onboarding status'
    });
  }
});

// ==================== UPDATE ONBOARDING STEP ====================
router.patch('/step/:stepNumber', authenticateSeller, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'bannerImage', maxCount: 1 },
  { name: 'dishImages', maxCount: 10 },
  { name: 'ownerIdProof', maxCount: 1 },
  { name: 'businessProof', maxCount: 1 }
]), async (req, res) => {
  try {
    const seller = req.seller;
    const stepNumber = parseInt(req.params.stepNumber);
    const updateData = {};

    console.log(`📝 Updating onboarding step ${stepNumber} for seller:`, seller.email);

    // Process files if any
    const fileUrls = {};
    if (req.files) {
      Object.keys(req.files).forEach(fieldName => {
        if (req.files[fieldName].length === 1) {
          fileUrls[fieldName] = `/uploads/sellers/${req.files[fieldName][0].filename}`;
        } else {
          fileUrls[fieldName] = req.files[fieldName].map(file => `/uploads/sellers/${file.filename}`);
        }
      });
    }

    // Update based on step number
    switch (stepNumber) {
      case 1: // Business Profile
        updateData.businessName = req.body.restaurantName;
        updateData.businessType = req.body.businessType;
        updateData['businessDetails.ownerName'] = req.body.ownerName;
        updateData['businessDetails.description'] = req.body.description;
        if (fileUrls.logo) updateData['businessDetails.documents.logo'] = fileUrls.logo;
        if (fileUrls.bannerImage) updateData['businessDetails.documents.bannerImage'] = fileUrls.bannerImage;
        break;

      case 2: // Location & Contact
        updateData['address.street'] = req.body.address;
        updateData['address.zipCode'] = req.body.pincode;
        updateData.phone = req.body.phoneNumber;
        if (req.body.latitude && req.body.longitude) {
          updateData['address.coordinates'] = {
            latitude: parseFloat(req.body.latitude),
            longitude: parseFloat(req.body.longitude)
          };
        }
        if (req.body.openingHours) {
          const openingHours = typeof req.body.openingHours === 'string' 
            ? JSON.parse(req.body.openingHours) 
            : req.body.openingHours;
          updateData['businessDetails.openingHours'] = openingHours;
        }
        break;

      case 3: // Payments & Finance
        updateData['businessDetails.banking'] = {
          accountNumber: req.body.bankAccount,
          ifscCode: req.body.ifscCode,
          accountHolder: req.body.accountHolder,
          panNumber: req.body.panNumber,
          gstNumber: req.body.gstNumber,
          razorpayId: req.body.razorpayId
        };
        break;

      case 4: // Verification Documents
        if (fileUrls.ownerIdProof) {
          updateData['businessDetails.documents.ownerIdProof'] = fileUrls.ownerIdProof;
        }
        if (fileUrls.businessProof) {
          updateData['businessDetails.documents.businessProof'] = fileUrls.businessProof;
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid step number'
        });
    }

    const updatedSeller = await Seller.findByIdAndUpdate(
      seller._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    console.log(`✅ Step ${stepNumber} updated successfully for seller:`, seller.email);

    res.json({
      success: true,
      message: `Step ${stepNumber} updated successfully`,
      seller: {
        id: updatedSeller._id,
        businessName: updatedSeller.businessName,
        onboardingCompleted: updatedSeller.onboardingCompleted
      }
    });

  } catch (error) {
    console.error(`❌ Update step ${req.params.stepNumber} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update onboarding step'
    });
  }
});

export default router;