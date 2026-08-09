const express = require('express');
const router = express.Router();
const { submitResponse, getAllResponses, deleteResponse } = require('../controllers/responseController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/analytics', protect, admin, getAllResponses);
router.post('/:surveyId', submitResponse);
router.delete('/:id', protect, admin, deleteResponse);

module.exports = router;
