const express = require('express');
const router = express.Router();
const controller = require('../controllers/applicationController');
const { requireRole } = require('../middleware/auth');
const {
  applicationVacancyManager,
  applicationOwnerOrAdmin,
  forceOwnJobSeekerId,
} = require('../middleware/ownership');
const { applicationCreateRules, applicationStatusRules } = require('../validators/applicationValidator');

// Подати відгук може лише шукач роботи
router.post('/', requireRole('JOB_SEEKER'), forceOwnJobSeekerId, applicationCreateRules, controller.create);
// Змінити статус — роботодавець цієї вакансії або адмін
router.put('/:id', requireRole('EMPLOYER', 'ADMIN'), applicationVacancyManager, applicationStatusRules, controller.updateStatus);
// Видалити — автор відгуку або адмін
router.delete('/:id', requireRole('JOB_SEEKER', 'ADMIN'), applicationOwnerOrAdmin, controller.delete);

module.exports = router;
