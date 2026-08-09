const Survey = require('../models/Survey');
const Response = require('../models/Response');

// Helper to generate a title-based alphanumeric code
const generateSlugCode = (title) => {
  let base = (title || 'SRV').replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (base.includes('MARKETING')) base = 'MKT';
  else base = base.substring(0, 3).padEnd(3, 'X');
  
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${base}-${random}`;
};

// @desc    Create a survey
// @route   POST /api/surveys
// @access  Private/Admin
const createSurvey = async (req, res) => {
  try {
    const { title, description, type, questions, status, theme, settings } = req.body;
    
    const finalTitle = title || 'Untitled Survey';
    const surveyCode = generateSlugCode(finalTitle);

    const survey = new Survey({
      adminId: req.user._id,
      title: finalTitle,
      type: type || 'survey',
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

    console.log('--- SURVEY CREATION DIAGNOSTIC ---');
    console.log('Database:', Survey.db.name);
    console.log('Host:', Survey.db.host);
    console.log('Collection:', Survey.collection.name);
    console.log('Connection state:', Survey.db.readyState);
    console.log('----------------------------------');

    const createdSurvey = await survey.save();
    res.status(201).json(createdSurvey);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all surveys for an admin
// @route   GET /api/surveys
// @access  Private/Admin
const getSurveys = async (req, res) => {
  try {
    const surveys = await Survey.find({ adminId: req.user._id }).sort({ createdAt: -1 }).lean();
    
    const surveysWithCounts = await Promise.all(
      surveys.map(async (survey) => {
        const responseCount = await Response.countDocuments({ surveyId: survey._id });
        return { ...survey, responseCount };
      })
    );
    
    res.json(surveysWithCounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get survey by ID
// @route   GET /api/surveys/:id
// @access  Private/Admin
const getSurveyById = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);

    if (survey && survey.adminId.toString() === req.user._id.toString()) {
      res.json(survey);
    } else {
      res.status(404).json({ message: 'Survey not found or unauthorized' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Update a survey (Builder save)
// @route   PUT /api/surveys/:id
// @access  Private/Admin
const updateSurvey = async (req, res) => {
  try {
    const { title, description, questions, theme, settings, status } = req.body;
    const survey = await Survey.findById(req.params.id);

    if (survey && survey.adminId.toString() === req.user._id.toString()) {
      if (title !== undefined) survey.title = title;
      if (description !== undefined) survey.description = description;
      if (questions !== undefined) survey.questions = questions;
      if (theme !== undefined) survey.theme = theme;
      if (settings !== undefined) survey.settings = settings;

      
      if (!survey.surveyCode) {
         survey.surveyCode = generateSlugCode(survey.title);
      }
      
      if (status) {
        survey.status = status;
      }

      const updatedSurvey = await survey.save();
      res.json(updatedSurvey);
    } else {
      res.status(404).json({ message: 'Survey not found or unauthorized' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get survey by code (Public)
// @route   GET /api/surveys/code/:code
// @access  Public
const getSurveyByCode = async (req, res) => {
  try {
    const survey = await Survey.findOne({ surveyCode: req.params.code, status: { $in: ['Published', 'Active'] } });
    if (survey) {
      res.json(survey);
    } else {
      res.status(404).json({ message: 'Survey not found or inactive' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a survey
// @route   DELETE /api/surveys/:id
// @access  Private/Admin
const deleteSurvey = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);

    if (survey && survey.adminId.toString() === req.user._id.toString()) {
      await survey.deleteOne();
      res.json({ message: 'Survey removed' });
    } else {
      res.status(404).json({ message: 'Survey not found or unauthorized' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createSurvey,
  getSurveys,
  getSurveyById,
  updateSurvey,
  deleteSurvey,
  getSurveyByCode,
};
