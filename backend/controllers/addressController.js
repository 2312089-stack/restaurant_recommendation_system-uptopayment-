import Address from '../models/Address.js';

export const getAllAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user.id }).sort({ isDefault: -1, createdAt: -1 });
    res.json({ success: true, addresses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getDefaultAddress = async (req, res) => {
  try {
    const address = await Address.findOne({ userId: req.user.id, isDefault: true });
    res.json({ success: true, address });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAddressById = async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, userId: req.user.id });
    if (!address) return res.status(404).json({ success: false, error: 'Address not found' });
    res.json({ success: true, address });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createAddress = async (req, res) => {
  try {
    const { isDefault } = req.body;
    
    // If this is set as default, unset other defaults
    if (isDefault) {
      await Address.updateMany({ userId: req.user.id }, { isDefault: false });
    }
    
    // If first address, make it default regardless
    const addressCount = await Address.countDocuments({ userId: req.user.id });
    const finalIsDefault = addressCount === 0 ? true : isDefault;

    const newAddress = new Address({
      ...req.body,
      userId: req.user.id,
      isDefault: finalIsDefault
    });

    await newAddress.save();
    res.status(201).json({ success: true, address: newAddress });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateAddress = async (req, res) => {
  try {
    const { isDefault } = req.body;
    
    if (isDefault) {
      await Address.updateMany(
        { userId: req.user.id, _id: { $ne: req.params.id } },
        { isDefault: false }
      );
    }

    const address = await Address.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!address) return res.status(404).json({ success: false, error: 'Address not found' });
    res.json({ success: true, address });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const setDefaultAddress = async (req, res) => {
  try {
    await Address.updateMany({ userId: req.user.id }, { isDefault: false });
    const address = await Address.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isDefault: true },
      { new: true }
    );

    if (!address) return res.status(404).json({ success: false, error: 'Address not found' });
    res.json({ success: true, address });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!address) return res.status(404).json({ success: false, error: 'Address not found' });
    
    // If we deleted the default address, make another one default if available
    if (address.isDefault) {
      const nextAddress = await Address.findOne({ userId: req.user.id });
      if (nextAddress) {
        nextAddress.isDefault = true;
        await nextAddress.save();
      }
    }

    res.json({ success: true, message: 'Address deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
