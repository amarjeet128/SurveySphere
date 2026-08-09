const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  surveyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Survey',
    required: true,
  },
  respondentId: {
    type: String, // Can be an email or a randomly generated session ID for anonymous users
  },
  respondentName: {
    type: String,
  },
  respondentEmail: {
    type: String,
  },
  answers: [{
    questionId: String,
    answer: mongoose.Schema.Types.Mixed,
  }],
  completedAt: {
    type: Date,
    default: Date.now,
  },
  timeTaken: {
    type: Number, // in seconds
  }
}, {
  timestamps: true,
});

const Response = mongoose.model('Response', responseSchema);
module.exports = Response;
