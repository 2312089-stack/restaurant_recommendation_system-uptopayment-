// controllers/userController.js - ENHANCED VERSION
import User from "../models/User.js";

// ✅ Save or update onboarding preferences
export const saveOnboarding = async (req, res) => {
  const { emailId, preferences } = req.body;

  try {
    console.log('🎯 Onboarding save request for:', emailId);

    // Enhanced validation
    if (!emailId || !preferences) {
      return res.status(400).json({
        success: false,
        error: "Email and preferences are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailId)) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid email address",
      });
    }

    // Validate preferences structure
    if (typeof preferences !== 'object' || preferences === null) {
      return res.status(400).json({
        success: false,
        error: "Preferences must be a valid object",
      });
    }

    // Sanitize and validate preference fields
    const validatedPreferences = {
      cuisines: Array.isArray(preferences.cuisines) ? preferences.cuisines.filter(c => typeof c === 'string' && c.trim().length > 0) : [],
      dietary: typeof preferences.dietary === 'string' ? preferences.dietary.trim() : '',
      spiceLevel: typeof preferences.spiceLevel === 'string' ? preferences.spiceLevel.trim() : '',
      mealTypes: Array.isArray(preferences.mealTypes) ? preferences.mealTypes.filter(m => typeof m === 'string' && m.trim().length > 0) : [],
      budget: typeof preferences.budget === 'string' ? preferences.budget.trim() : '',
      favoriteDishes: Array.isArray(preferences.favoriteDishes) ? preferences.favoriteDishes.filter(d => typeof d === 'string' && d.trim().length > 0) : []
    };

    console.log('📋 Validated preferences:', validatedPreferences);

    const cleanEmail = emailId.trim().toLowerCase();

    // Find and update user with enhanced error handling
    const user = await User.findOneAndUpdate(
      { emailId: cleanEmail },
      { 
        preferences: validatedPreferences, 
        onboardingCompleted: true,
        updatedAt: new Date()
      },
      { 
        new: true, 
        runValidators: true,
        select: '-passwordHash -resetToken -resetTokenExpiry -passwordResetToken -passwordResetExpires'
      }
    );

    if (!user) {
      console.log('❌ User not found with email:', cleanEmail);
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    console.log('✅ Onboarding completed successfully for:', user.emailId);

    // Enhanced response with user data
    res.json({
      success: true,
      message: "Onboarding data saved successfully",
      user: {
        id: user._id,
        emailId: user.emailId,
        name: user.name,
        preferences: user.preferences,
        onboardingCompleted: user.onboardingCompleted,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
    });

  } catch (err) {
    console.error("❌ Onboarding save error:", err);

    // Handle specific MongoDB errors
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(error => error.message);
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${validationErrors.join(', ')}`,
      });
    }

    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: "Invalid data format provided",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to save onboarding data",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
};

// ✅ Get user onboarding status (bonus function - same structure)
export const getOnboardingStatus = async (req, res) => {
  const { emailId } = req.query;

  try {
    console.log('📊 Checking onboarding status for:', emailId);

    if (!emailId) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const cleanEmail = emailId.trim().toLowerCase();

    const user = await User.findOne(
      { emailId: cleanEmail },
      { 
        emailId: 1, 
        onboardingCompleted: 1, 
        preferences: 1,
        name: 1,
        createdAt: 1
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Onboarding status retrieved successfully",
      user: {
        id: user._id,
        emailId: user.emailId,
        name: user.name,
        onboardingCompleted: user.onboardingCompleted || false,
        preferences: user.preferences || {},
        createdAt: user.createdAt
      },
    });

  } catch (err) {
    console.error("❌ Get onboarding status error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve onboarding status",
    });
  }
};
