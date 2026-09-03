const mongoose = require('mongoose');

const livePollSchema = new mongoose.Schema({
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
    enum: ['live'],
    default: 'live',
  },
  description: {
    type: String,
  },
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Ended'],
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
    rows: [String],
    columns: [String],
    required: Boolean,
    allowMultiple: { type: Boolean, default: false },
    showPercentage: { type: Boolean, default: false },
    chartType: { type: String, default: 'bar' },
    imageUrl: { type: String },
    imageProps: {
      x: Number,
      y: Number,
      width: Number,
      height: Number
    },
    titleProps: {
      x: Number,
      y: Number,
      width: Number,
      fontSize: Number
    },
    correctAnswer: { type: String }
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
  settings: {
    isPublic: { type: Boolean, default: true },
    requireEmail: { type: Boolean, default: false },
    requireName: { type: Boolean, default: false },
  },
  waitingRoom: {
    enabled: { type: Boolean, default: false },
    template: { type: String, enum: ['default', 'modern', 'playful'], default: 'default' }
  },
  liveResults: {
    participants: [String],
    participantsData: [{
      name: String,
      avgTime: Number,       // avg seconds per question
      correctAnswers: Number // for future use
    }],
    votes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  }
}, {
  timestamps: true,
});

const LivePoll = mongoose.model('LivePoll', livePollSchema);
module.exports = LivePoll;
