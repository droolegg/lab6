const express = require('express');
const router = express.Router();
const controller = require('../controllers/employerController');
const { requireRole } = require('../middleware/auth');
const { selfEmployerOrAdmin } = require('../middleware/ownership');
const { employerProfileRules } = require('../validators/employerValidator');

// Створення роботодавців — лише через реєстрацію (/register/employer)
router.get('/', requireRole('ADMIN'), controller.list);
router.get('/:id/edit', requireRole('ADMIN', 'EMPLOYER'), selfEmployerOrAdmin, controller.editForm);
router.put('/:id', requireRole('ADMIN', 'EMPLOYER'), selfEmployerOrAdmin, employerProfileRules, controller.update);
router.delete('/:id', requireRole('ADMIN'), controller.delete);

module.exports = router;
