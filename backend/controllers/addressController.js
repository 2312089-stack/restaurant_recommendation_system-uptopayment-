// backend/controllers/addressController.js
import Address from '../models/Address.js';
import { validationResult } from 'express-validator';

const addressController = {
  // Get all addresses for a user
  getAllAddresses: async (req, res) => {
    try {
      console.log(`Fetching addresses for user: ${req.user.id}`);
      
      const addresses = await Address.find({ userId: req.user.id })
        .sort({ isDefault: -1, createdAt: -1 });
      
      console.log(`Found ${addresses.length} addresses for user ${req.user.id}`);
      
      res.status(200).json({
        success: true,
        data: addresses,
        count: addresses.length,
        message: 'Addresses retrieved successfully'
      });
    } catch (error) {
      console.error('Get addresses error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve addresses',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // Get single address by ID
  getAddressById: async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const address = await Address.findOne({
        _id: req.params.id,
        userId: req.user.id
      });
      
      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: address,
        message: 'Address retrieved successfully'
      });
    } catch (error) {
      console.error('Get address by ID error:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid address ID format'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve address',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // Create new address
  createAddress: async (req, res) => {
    try {
      console.log('Creating new address for user:', req.user.id);
      console.log('Request body:', req.body);
      
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array().map(err => ({
            field: err.path || err.param,
            message: err.msg || err.message,
            value: err.value
          }))
        });
      }

      // Clean and prepare address data
      const addressData = {
        userId: req.user.id,
        fullName: req.body.fullName.trim(),
        phoneNumber: req.body.phoneNumber.trim(),
        alternatePhone: req.body.alternatePhone ? req.body.alternatePhone.trim() : '',
        pincode: req.body.pincode.trim(),
        state: req.body.state.trim(),
        city: req.body.city.trim(),
        houseNo: req.body.houseNo.trim(),
        roadArea: req.body.roadArea.trim(),
        landmark: req.body.landmark ? req.body.landmark.trim() : '',
        type: req.body.type || 'home',
        isDefault: Boolean(req.body.isDefault)
      };

      console.log('Processed address data:', addressData);

      // If this is being set as default, unset all other defaults first
      if (addressData.isDefault) {
        console.log('Setting as default - unsetting other defaults');
        await Address.updateMany(
          { userId: req.user.id },
          { isDefault: false }
        );
      }

      // Create new address
      const newAddress = new Address(addressData);
      
      // Validate before saving
      const validationError = newAddress.validateSync();
      if (validationError) {
        console.log('MongoDB validation error:', validationError);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: Object.values(validationError.errors).map(err => ({
            field: err.path,
            message: err.message,
            value: err.value
          }))
        });
      }

      await newAddress.save();
      console.log('Address created successfully:', newAddress._id);
      
      res.status(201).json({
        success: true,
        data: newAddress,
        message: 'Address created successfully'
      });
    } catch (error) {
      console.error('Create address error:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message,
            value: err.value
          }))
        });
      }
      
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Duplicate address entry'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create address',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // Update existing address
  updateAddress: async (req, res) => {
    try {
      console.log('Updating address:', req.params.id);
      console.log('Request body:', req.body);
      
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array().map(err => ({
            field: err.path || err.param,
            message: err.msg || err.message,
            value: err.value
          }))
        });
      }

      const address = await Address.findOne({
        _id: req.params.id,
        userId: req.user.id
      });
      
      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      // If setting as default, unset all other defaults
      if (req.body.isDefault && !address.isDefault) {
        console.log('Setting as default - unsetting other defaults');
        await Address.updateMany(
          { userId: req.user.id, _id: { $ne: req.params.id } },
          { isDefault: false }
        );
      }

      // Clean and update the address data
      const updateData = {
        fullName: req.body.fullName.trim(),
        phoneNumber: req.body.phoneNumber.trim(),
        alternatePhone: req.body.alternatePhone ? req.body.alternatePhone.trim() : '',
        pincode: req.body.pincode.trim(),
        state: req.body.state.trim(),
        city: req.body.city.trim(),
        houseNo: req.body.houseNo.trim(),
        roadArea: req.body.roadArea.trim(),
        landmark: req.body.landmark ? req.body.landmark.trim() : '',
        type: req.body.type || address.type,
        isDefault: Boolean(req.body.isDefault)
      };

      // Update the address
      Object.assign(address, updateData);
      await address.save();
      
      console.log('Address updated successfully:', address._id);
      
      res.status(200).json({
        success: true,
        data: address,
        message: 'Address updated successfully'
      });
    } catch (error) {
      console.error('Update address error:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid address ID format'
        });
      }
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message,
            value: err.value
          }))
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update address',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // Delete address
  deleteAddress: async (req, res) => {
    try {
      console.log('Deleting address:', req.params.id);
      
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const address = await Address.findOne({
        _id: req.params.id,
        userId: req.user.id
      });
      
      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      // If deleting default address, set another address as default
      if (address.isDefault) {
        console.log('Deleting default address - setting new default');
        const nextAddress = await Address.findOne({
          userId: req.user.id,
          _id: { $ne: req.params.id }
        }).sort({ createdAt: -1 });
        
        if (nextAddress) {
          nextAddress.isDefault = true;
          await nextAddress.save();
          console.log('Set new default address:', nextAddress._id);
        }
      }

      await Address.findByIdAndDelete(req.params.id);
      console.log('Address deleted successfully:', req.params.id);
      
      res.status(200).json({
        success: true,
        message: 'Address deleted successfully'
      });
    } catch (error) {
      console.error('Delete address error:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid address ID format'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete address',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // Set address as default
  setDefaultAddress: async (req, res) => {
    try {
      console.log('Setting default address:', req.params.id);
      
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const address = await Address.findOne({
        _id: req.params.id,
        userId: req.user.id
      });
      
      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      // Set all other addresses to not default
      await Address.updateMany(
        { userId: req.user.id },
        { isDefault: false }
      );

      // Set this address as default
      address.isDefault = true;
      await address.save();
      
      console.log('Default address updated successfully:', address._id);
      
      res.status(200).json({
        success: true,
        data: address,
        message: 'Default address updated successfully'
      });
    } catch (error) {
      console.error('Set default address error:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid address ID format'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to set default address',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // Get default address
  getDefaultAddress: async (req, res) => {
    try {
      console.log('Getting default address for user:', req.user.id);
      
      const defaultAddress = await Address.findOne({
        userId: req.user.id,
        isDefault: true
      });
      
      if (!defaultAddress) {
        return res.status(404).json({
          success: false,
          message: 'No default address found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: defaultAddress,
        message: 'Default address retrieved successfully'
      });
    } catch (error) {
      console.error('Get default address error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve default address',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};

export default addressController;