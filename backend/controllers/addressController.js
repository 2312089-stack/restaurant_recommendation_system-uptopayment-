import { validationResult } from 'express-validator';
import Address from '../models/Address.js';

// Get all addresses for the logged-in user
export const getAllAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
    res.json({ success: true, count: addresses.length, data: addresses });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching addresses' });
  }
};

// Get the default address for the logged-in user
export const getDefaultAddress = async (req, res) => {
  try {
    const defaultAddress = await Address.findOne({ userId: req.user._id, isDefault: true });
    
    if (!defaultAddress) {
      return res.status(404).json({ success: false, message: 'No default address found' });
    }
    
    res.json({ success: true, data: defaultAddress });
  } catch (error) {
    console.error('Error fetching default address:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching default address' });
  }
};

// Get a specific address by ID
export const getAddressById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const address = await Address.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }
    
    res.json({ success: true, data: address });
  } catch (error) {
    console.error('Error fetching address:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching address' });
  }
};

// Create a new address
export const createAddress = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      fullName, phoneNumber, alternatePhone, pincode, state, city, houseNo, roadArea, landmark, type, isDefault
    } = req.body;

    // Check if this is the user's first address
    const addressCount = await Address.countDocuments({ userId: req.user._id });
    
    // Automatically set as default if it's the first address, or if explicitly requested
    const shouldBeDefault = addressCount === 0 ? true : (isDefault === true);

    const newAddress = new Address({
      userId: req.user._id,
      fullName,
      phoneNumber,
      alternatePhone,
      pincode,
      state,
      city,
      houseNo,
      roadArea,
      landmark,
      type,
      isDefault: shouldBeDefault
    });

    await newAddress.save();

    res.status(201).json({ success: true, message: 'Address created successfully', data: newAddress });
  } catch (error) {
    console.error('Error creating address:', error);
    res.status(500).json({ success: false, message: 'Server error while creating address' });
  }
};

// Update an existing address
export const updateAddress = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const addressId = req.params.id;
    const updateData = req.body;

    // We don't want to update userId
    delete updateData.userId;

    // Find and update the address
    const address = await Address.findOne({ _id: addressId, userId: req.user._id });

    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      address[key] = updateData[key];
    });

    await address.save();

    res.json({ success: true, message: 'Address updated successfully', data: address });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ success: false, message: 'Server error while updating address' });
  }
};

// Set an address as default
export const setDefaultAddress = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const addressId = req.params.id;

    const address = await Address.findOne({ _id: addressId, userId: req.user._id });

    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    address.isDefault = true;
    await address.save();

    res.json({ success: true, message: 'Address set as default successfully', data: address });
  } catch (error) {
    console.error('Error setting default address:', error);
    res.status(500).json({ success: false, message: 'Server error while setting default address' });
  }
};

// Delete an address
export const deleteAddress = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const addressId = req.params.id;

    const address = await Address.findOne({ _id: addressId, userId: req.user._id });

    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    const wasDefault = address.isDefault;

    await address.deleteOne();

    // If the deleted address was the default, set another address as default (if any exists)
    if (wasDefault) {
      const anotherAddress = await Address.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
      if (anotherAddress) {
        anotherAddress.isDefault = true;
        await anotherAddress.save();
      }
    }

    res.json({ success: true, message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting address' });
  }
};

export default {
  getAllAddresses,
  getDefaultAddress,
  getAddressById,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress
};
