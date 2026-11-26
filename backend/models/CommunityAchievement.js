const mongoose = require('mongoose');

const communityAchievementSchema = new mongoose.Schema(
  {
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
    badgeType: {
      type: String,
      enum: [
        'First Contribution',
        'Consistent Contributor',
        '1000kg Club',
        'Clean Village Champion',
        'Bio-Slurry Pioneer',
        'Safety Advocate'
      ],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    earnedAt: {
      type: Date,
      default: Date.now
    },
    pointsAwarded: {
      type: Number,
      default: 50
    }
  },
  {
    timestamps: true
  }
);

communityAchievementSchema.index({ household: 1, badgeType: 1 }, { unique: true });

module.exports = mongoose.model('CommunityAchievement', communityAchievementSchema);
