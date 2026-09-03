const express = require('express');
const router = express.Router();
const {
  createLivePoll,
  getLivePolls,
  getLivePollById,
  updateLivePoll,
  deleteLivePoll,
  getLivePollByCode,
  duplicateLivePoll
} = require('../controllers/livePollController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, admin, createLivePoll)
  .get(protect, admin, getLivePolls);

router.route('/code/:code').get(getLivePollByCode);

router.route('/:id')
  .get(protect, admin, getLivePollById)
  .put(protect, admin, updateLivePoll)
  .delete(protect, admin, deleteLivePoll);

router.post('/:id/duplicate', protect, admin, duplicateLivePoll);

module.exports = router;
