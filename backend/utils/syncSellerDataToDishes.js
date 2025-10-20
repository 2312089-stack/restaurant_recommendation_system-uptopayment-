// backend/utils/syncSellerDataToDishes.js
import Dish from '../models/Dish.js';

/**
 * Sync seller profile updates to all their dishes
 * This ensures denormalized data stays consistent
 */
export const syncSellerDataToDishes = async (sellerId, sellerData) => {
  try {
    console.log('🔄 Syncing seller data to dishes for seller:', sellerId);

    const updateData = {};
    
    // Update restaurant name if changed
    if (sellerData.businessName) {
      updateData.restaurantName = sellerData.businessName;
      updateData.sellerName = sellerData.businessName;
    }

    // Update location if changed
    if (sellerData.address) {
      updateData['location.street'] = sellerData.address.street || '';
      updateData['location.city'] = sellerData.address.city || '';
      updateData['location.state'] = sellerData.address.state || '';
      updateData['location.zipCode'] = sellerData.address.zipCode || '';
      
      if (sellerData.address.coordinates) {
        updateData['location.coordinates'] = {
          latitude: sellerData.address.coordinates.latitude,
          longitude: sellerData.address.coordinates.longitude
        };
      }
    }

    // Only update if there's data to sync
    if (Object.keys(updateData).length === 0) {
      console.log('ℹ️ No dish data to sync');
      return { success: true, updated: 0 };
    }

    // Update all dishes for this seller
    const result = await Dish.updateMany(
      { 
        $or: [
          { seller: sellerId },
          { restaurantId: sellerId }
        ]
      },
      { $set: updateData }
    );

    console.log(`✅ Updated ${result.modifiedCount} dishes with new seller data`);

    return {
      success: true,
      updated: result.modifiedCount,
      changes: updateData
    };

  } catch (error) {
    console.error('❌ Error syncing seller data to dishes:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default syncSellerDataToDishes;