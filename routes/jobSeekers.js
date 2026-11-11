const express = require('express');
const router = express.Router();
const controller = require('../controllers/jobSeekerController');
const { requireRole } = require('../middleware/auth');
const { selfJobSeekerOrAdmin } = require('../middleware/ownership');
const { jobSeekerProfileRules } = require('../validators/jobSeekerValidator');

// Створення шукачів — лише через реєстрацію (/register/jobseeker)
router.get('/', requireRole('ADMIN', 'EMPLOYER'), controller.list);
router.get('/:id/edit', requireRole('ADMIN', 'JOB_SEEKER'), selfJobSeekerOrAdmin, controller.editForm);
router.put('/:id', requireRole('ADMIN', 'JOB_SEEKER'), selfJobSeekerOrAdmin, jobSeekerProfileRules, controller.update);
router.delete('/:id', requireRole('ADMIN'), controller.delete);

module.exports = router;
