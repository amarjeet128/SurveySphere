const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'superadmin'],
    default: 'admin',
  },
  globalTheme: {
    type: Object,
    default: {
      primaryColor: '#6366f1',
      backgroundColor: '#f8fafc',
      fontFamily: 'Inter',
      isLight: true,
      logoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=SurveySphere&backgroundColor=6366f1',
      layout: 'centered',
      buttonStyle: 'pill',
      progressStyle: 'bar',
      animationStyle: 'slide',
    }
  },
  globalSettings: {
    type: Object,
    default: {
      showEstimatedTime: true,
      estimatedTimeText: '3 mins',
      showQuestionCount: true,
      buttonText: 'Begin Survey',
      timeLimit: 0,
    }
  }
}, {
  timestamps: true,
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
