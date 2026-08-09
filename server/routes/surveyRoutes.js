const express = require('express');
const router = express.Router();
const {
  createSurvey,
  getSurveys,
  getSurveyById,
  updateSurvey,
  deleteSurvey,
  getSurveyByCode
} = require('../controllers/surveyController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, admin, createSurvey)
  .get(protect, admin, getSurveys);

router.route('/code/:code').get(getSurveyByCode);

router.route('/:id')
  .get(protect, admin, getSurveyById)
  .put(protect, admin, updateSurvey)
  .delete(protect, admin, deleteSurvey);

module.exports = router;
