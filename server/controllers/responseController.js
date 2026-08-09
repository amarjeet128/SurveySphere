const Response = require('../models/Response');
const Survey = require('../models/Survey');

// @desc    Submit a survey response
// @route   POST /api/responses/:surveyId
// @access  Public
const submitResponse = async (req, res) => {
  try {
    const { respondentName, respondentEmail, answers, timeTaken } = req.body;
    const { surveyId } = req.params;

    const survey = await Survey.findById(surveyId);
    if (!survey || !['Published', 'Active'].includes(survey.status)) {
      return res.status(400).json({ message: 'Survey is not available' });
    }

    const response = new Response({
      surveyId,
      respondentName,
      respondentEmail,
      answers,
      timeTaken,
    });

    await response.save();
    res.status(201).json({ message: 'Survey submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllResponses = async (req, res) => {
  try {
    const surveys = await Survey.find({ adminId: req.user._id }).select('_id title surveyCode');
    const surveyIds = surveys.map(s => s._id);

    const responses = await Response.find({ surveyId: { $in: surveyIds } })
      .populate({ path: 'surveyId', select: 'title surveyCode questions' })
      .sort({ createdAt: -1 });

    res.json(responses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteResponse = async (req, res) => {
  try {
    const responseId = req.params.id;
    const response = await Response.findById(responseId).populate('surveyId');

    if (!response) {
      return res.status(404).json({ message: 'Response not found' });
    }

    // Verify the logged-in admin owns the survey this response belongs to
    if (response.surveyId.adminId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this response' });
    }

    await response.deleteOne();
    res.json({ message: 'Response deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { submitResponse, getAllResponses, deleteResponse };
