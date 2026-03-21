import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[+]?[\d\s-()]{10,15}$/.test(v.replace(/\s/g, ''));
      },
      message: 'Invalid phone number format'
    }
  },
  alternatePhone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[+]?[\d\s-()]{10,15}$/.test(v.replace(/\s/g, ''));
      },
      message: 'Invalid alternate phone number format'
    }
  },
  pincode: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[0-9]{6}$/.test(v);
      },
      message: 'Pincode must be 6 digits'
    }
  },
  state: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  city: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  houseNo: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  roadArea: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  landmark: {
    type: String,
    trim: true,
    default: '',
    maxlength: 200
  },
  type: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index for better query performance
addressSchema.index({ userId: 1, isDefault: -1 });
addressSchema.index({ userId: 1, type: 1 });

// Ensure only one default address per user
addressSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

const Address = mongoose.model('Address', addressSchema);

export default Address;
