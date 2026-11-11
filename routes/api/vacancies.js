const express = require('express');
const router = express.Router();
const c = require('../../controllers/api/vacancyApiController');
const { apiRole, idParam, mergeBody } = require('../../middleware/apiAuth');
const { forceOwnEmployerId } = require('../../middleware/ownership');
const { asyncHandler: w } = require('../../controllers/api/apiHelpers');
const { validate, vacancyRefRules } = require('../../validators/apiValidator');
const { vacancyValidationRules } = require('../../validators/vacancyValidator');

const employerOrAdmin = apiRole('EMPLOYER', 'ADMIN');
router.param('id', idParam);

// Правила: спільні з веб-версією + перевірка, що роботодавець і категорія існують
const rules = [vacancyValidationRules, vacancyRefRules, validate];

router.get('/', w(c.list));                                       // публічно (видимість залежить від ролі)
router.get('/:id', w(c.get));                                     // публічно (лише OPEN, чернетки — власнику/адміну)
router.get('/:id/applications', employerOrAdmin, c.loadManaged, w(c.applications));
router.post('/', employerOrAdmin, forceOwnEmployerId, ...rules, w(c.create));
router.put('/:id', employerOrAdmin, c.loadManaged, forceOwnEmployerId, ...rules, w(c.update));
router.patch('/:id', employerOrAdmin, c.loadManaged, mergeBody(c.currentValues), forceOwnEmployerId, ...rules, w(c.update));
router.delete('/:id', employerOrAdmin, c.loadManaged, w(c.remove));

module.exports = router;
