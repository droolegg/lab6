const express = require('express');
const router = express.Router();
const controller = require('../controllers/categoryController');
const { requireRole } = require('../middleware/auth');
const { categoryValidationRules } = require('../validators/categoryValidator');

const adminOnly = requireRole('ADMIN');

router.get('/', controller.list); // перегляд — для всіх (у т.ч. відвідувачів)
router.get('/new', adminOnly, controller.newForm);
router.post('/', adminOnly, categoryValidationRules, controller.create);
router.get('/:id/edit', adminOnly, controller.editForm);
router.put('/:id', adminOnly, categoryValidationRules, controller.update);
router.delete('/:id', adminOnly, controller.delete);

module.exports = router;
