const express = require('express');
const { 
  getProgress, 
  updateLessonProgress,
  getAllProgress
} = require('../controllers/progressController');

const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAllProgress);

router.route('/:courseId')
  .get(getProgress);

router.route('/:courseId/lessons/:lessonId')
  .put(updateLessonProgress);

module.exports = router;