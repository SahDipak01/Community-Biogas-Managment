const mongoose = require('mongoose');

const wasteCollectionRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    household: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      required: true
    },
    wasteTypes: [
      {
        type: String,
        enum: [
          'Cattle Dung',
          'Kitchen Organic Waste',
          'Agricultural Crop Residue',
          'Poultry / Farm Litter'
        ],
        required: true
      }
    ],
    estimatedQuantityKg: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1 kg']
    },
    preferredDate: {
      type: Date,
      required: true
    },
    preferredTimeSlot: {
      type: String,
      enum: [
        'Morning (06:00 - 09:00)',
        'Mid-day (10:00 - 13:00)',
        'Evening (16:00 - 19:00)'
      ],
      default: 'Morning (06:00 - 09:00)'
    },
    pickupLocation: {
      address: { type: String, default: '' },
      landmark: { type: String, default: '' },
      latitude: { type: Number },
      longitude: { type: Number }
    },
    additionalInstructions: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: [
        'Submitted',
        'Approved',
        'Scheduled',
        'Assigned',
        'Collected',
        'Missed',
        'Rescheduled',
        'Cancelled'
      ],
      default: 'Submitted'
    },
    assignedWorker: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' }
    },
    scheduledDate: {
      type: Date
    },
    actualCollectedKg: {
      type: Number,
      default: 0
    },
    collectedAt: {
      type: Date
    },
    missedReason: {
      type: String,
      default: ''
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

wasteCollectionRequestSchema.index({ village: 1, status: 1, preferredDate: -1 });
wasteCollectionRequestSchema.index({ household: 1, createdAt: -1 });

module.exports = mongoose.model('WasteCollectionRequest', wasteCollectionRequestSchema);
