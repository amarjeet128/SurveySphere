const mongoose = require('mongoose');

const surveySchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['survey', 'live'],
    default: 'survey',
  },
  description: {
    type: String,
  },
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Active', 'Paused', 'Closed', 'Expired', 'Archived', 'Ended'],
    default: 'Draft',
  },
  surveyCode: {
    type: String,
    unique: true,
    sparse: true,
  },
  questions: [{
    id: String,
    type: { type: String },
    title: String,
    options: [String],
    required: Boolean,
    allowMultiple: { type: Boolean, default: false },
    showPercentage: { type: Boolean, default: false },
    chartType: { type: String, default: 'bar' },
  }],
  theme: {
    primaryColor: { type: String, default: '#6366f1' },
    backgroundColor: { type: String, default: '#0f172a' },
    fontFamily: { type: String, default: 'Inter' },
    logoUrl: { type: String, default: '' },
    layout: { type: String, enum: ['centered', 'split', 'classic'], default: 'centered' },
    buttonStyle: { type: String, enum: ['rounded', 'pill', 'square'], default: 'rounded' },
    progressStyle: { type: String, enum: ['bar', 'circle', 'text', 'hidden'], default: 'bar' },
    animationStyle: { type: String, enum: ['fade', 'slide', 'spring'], default: 'slide' },
    backgroundImage: { type: String, default: '' },
  },
  landingPage: {
    showEstimatedTime: { type: Boolean, default: true },
    estimatedTimeText: { type: String, default: '2 mins' },
    showQuestionCount: { type: Boolean, default: true },
    buttonText: { type: String, default: 'Start Survey' },
  },
  thankYouPage: {
    title: { type: String, default: 'Thank You!' },
    message: { type: String, default: 'Your response has been successfully recorded.' },
    showConfetti: { type: Boolean, default: true },
  },
  settings: {
    isPublic: { type: Boolean, default: true },
    requireEmail: { type: Boolean, default: false },
    requireName: { type: Boolean, default: false },
  },
  liveResults: {
    participants: [String],
    votes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  }
}, {
  timestamps: true,
});

const Survey = mongoose.model('Survey', surveySchema);
module.exports = Survey;
