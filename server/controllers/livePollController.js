const LivePoll = require('../models/LivePoll');

// Helper to generate a title-based alphanumeric code
const generateSlugCode = (title) => {
  let base = (title || 'LIVE').replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (base.includes('MARKETING')) base = 'MKT';
  else base = base.substring(0, 3).padEnd(3, 'X');
  
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${base}-${random}`;
};

// @desc    Create a live poll
// @route   POST /api/livepolls
// @access  Private/Admin
const createLivePoll = async (req, res) => {
  try {
    const { title, description, questions, status, theme, settings } = req.body;
    
    const finalTitle = title || 'Untitled Live Poll';
    const surveyCode = generateSlugCode(finalTitle);

    const livePoll = new LivePoll({
      adminId: req.user._id,
      title: finalTitle,
      type: 'live',
      description: description || '',
      questions: questions || [],
      status: status || 'Draft',
      surveyCode,
      theme: theme || {
        primaryColor: '#6366f1',
        backgroundColor: '#0f172a',
        fontFamily: 'Inter',
      },
      settings: settings || {}
    });

    const createdPoll = await livePoll.save();
    res.status(201).json(createdPoll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all live polls for an admin
// @route   GET /api/livepolls
// @access  Private/Admin
const getLivePolls = async (req, res) => {
  try {
    const livePolls = await LivePoll.find({ adminId: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json(livePolls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get live poll by ID
// @route   GET /api/livepolls/:id
// @access  Private/Admin
const getLivePollById = async (req, res) => {
  try {
    const livePoll = await LivePoll.findById(req.params.id);

    if (livePoll && livePoll.adminId.toString() === req.user._id.toString()) {
      res.json(livePoll);
    } else {
      res.status(404).json({ message: 'Live poll not found or unauthorized' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a live poll
// @route   PUT /api/livepolls/:id
// @access  Private/Admin
const updateLivePoll = async (req, res) => {
  try {
    const { title, description, questions, theme, settings, status, waitingRoom } = req.body;
    const livePoll = await LivePoll.findById(req.params.id);

    if (livePoll && livePoll.adminId.toString() === req.user._id.toString()) {
      if (title !== undefined) livePoll.title = title;
      if (description !== undefined) livePoll.description = description;
      if (questions !== undefined) livePoll.questions = questions;
      if (theme !== undefined) livePoll.theme = theme;
      if (settings !== undefined) livePoll.settings = settings;
      if (waitingRoom !== undefined) livePoll.waitingRoom = waitingRoom;

      if (!livePoll.surveyCode) {
         livePoll.surveyCode = generateSlugCode(livePoll.title);
      }
      
      if (status) {
        livePoll.status = status;
      }

      const updatedPoll = await livePoll.save();
      res.json(updatedPoll);
    } else {
      res.status(404).json({ message: 'Live poll not found or unauthorized' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get live poll by code (Public)
// @route   GET /api/livepolls/code/:code
// @access  Public
const getLivePollByCode = async (req, res) => {
  try {
    const livePoll = await LivePoll.findOne({ surveyCode: req.params.code });
    if (livePoll) {
      res.json(livePoll);
    } else {
      res.status(404).json({ message: 'Live poll not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a live poll
// @route   DELETE /api/livepolls/:id
// @access  Private/Admin
const deleteLivePoll = async (req, res) => {
  try {
    const livePoll = await LivePoll.findById(req.params.id);

    if (livePoll && livePoll.adminId.toString() === req.user._id.toString()) {
      await livePoll.deleteOne();
      res.json({ message: 'Live poll removed' });
    } else {
      res.status(404).json({ message: 'Live poll not found or unauthorized' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Duplicate a live poll
// @route   POST /api/livepolls/:id/duplicate
// @access  Private/Admin
const duplicateLivePoll = async (req, res) => {
  try {
    const originalPoll = await LivePoll.findById(req.params.id);

    if (originalPoll && originalPoll.adminId.toString() === req.user._id.toString()) {
      const finalTitle = `${originalPoll.title} (Copy)`;
      const surveyCode = generateSlugCode(finalTitle);

      const duplicatedPoll = new LivePoll({
        adminId: req.user._id,
        title: finalTitle,
        type: 'live',
        description: originalPoll.description,
        questions: originalPoll.questions,
        status: 'Draft',
        surveyCode,
        theme: originalPoll.theme,
        settings: originalPoll.settings
      });

      const createdPoll = await duplicatedPoll.save();
      res.status(201).json(createdPoll);
    } else {
      res.status(404).json({ message: 'Live poll not found or unauthorized' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createLivePoll,
  getLivePolls,
  getLivePollById,
  updateLivePoll,
  deleteLivePoll,
  getLivePollByCode,
  duplicateLivePoll
};
