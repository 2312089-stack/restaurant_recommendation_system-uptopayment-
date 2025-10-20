import Offer from '../models/Offer.js';
import Dish from '../models/Dish.js';

export const createOffer = async (req, res) => {
  try {
    const offerData = {
      ...req.body,
      sellerId: req.seller._id
    };
    
    const offer = await Offer.create(offerData);
    
    // Apply offer to selected dishes
    if (offer.applicableDishes && offer.applicableDishes.length > 0) {
      await Dish.updateMany(
        { _id: { $in: offer.applicableDishes }, seller: req.seller._id },
        {
          $set: {
            'offer.hasOffer': true,
            'offer.discountPercentage': offer.discountPercentage,
            'offer.validUntil': offer.validUntil
          }
        }
      );
    }
    
    res.status(201).json({ success: true, offer });
  } catch (error) {
    console.error('Create offer error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getSellerOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ sellerId: req.seller._id })
      .populate('applicableDishes', 'name price image category')
      .sort('-createdAt');
    
    res.json({ success: true, offers });
  } catch (error) {
    console.error('Get offers error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findOneAndUpdate(
      { _id: req.params.id, sellerId: req.seller._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('applicableDishes');
    
    if (!offer) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }
    
    // Update dishes with new offer details
    if (offer.applicableDishes && offer.applicableDishes.length > 0) {
      await Dish.updateMany(
        { _id: { $in: offer.applicableDishes.map(d => d._id) } },
        {
          $set: {
            'offer.hasOffer': offer.isActive,
            'offer.discountPercentage': offer.discountPercentage,
            'offer.validUntil': offer.validUntil
          }
        }
      );
    }
    
    res.json({ success: true, offer });
  } catch (error) {
    console.error('Update offer error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findOne({
      _id: req.params.id,
      sellerId: req.seller._id
    });
    
    if (!offer) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }
    
    // Remove offer from dishes
    if (offer.applicableDishes && offer.applicableDishes.length > 0) {
      await Dish.updateMany(
        { _id: { $in: offer.applicableDishes } },
        {
          $set: {
            'offer.hasOffer': false,
            'offer.discountPercentage': 0,
            'offer.validUntil': null
          }
        }
      );
    }
    
    await offer.deleteOne();
    
    res.json({ success: true, message: 'Offer deleted successfully' });
  } catch (error) {
    console.error('Delete offer error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findOne({
      _id: req.params.id,
      sellerId: req.seller._id
    }).populate('applicableDishes', 'name price image category');
    
    if (!offer) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }
    
    res.json({ success: true, offer });
  } catch (error) {
    console.error('Get offer error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};