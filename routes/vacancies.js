const express = require('express');
const router = express.Router();
const controller = require('../controllers/vacancyController');
const { requireRole } = require('../middleware/auth');
const { vacancyManager, forceOwnEmployerId } = require('../middleware/ownership');
const { vacancyValidationRules } = require('../validators/vacancyValidator');

const employerOrAdmin = requireRole('EMPLOYER', 'ADMIN');

router.get('/', controller.list); // перегляд — для всіх
router.get('/new', employerOrAdmin, controller.newForm);
router.post('/', employerOrAdmin, forceOwnEmployerId, vacancyValidationRules, controller.create);
router.get('/:id', controller.show);
router.get('/:id/edit', employerOrAdmin, vacancyManager, controller.editForm);
router.put('/:id', employerOrAdmin, vacancyManager, forceOwnEmployerId, vacancyValidationRules, controller.update);
router.delete('/:id', employerOrAdmin, vacancyManager, controller.delete);

module.exports = router;
