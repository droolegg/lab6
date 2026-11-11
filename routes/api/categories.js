const express = require('express');
const router = express.Router();
const c = require('../../controllers/api/categoryApiController');
const { apiRole, idParam, mergeBody } = require('../../middleware/apiAuth');
const { asyncHandler: w } = require('../../controllers/api/apiHelpers');
const { validate } = require('../../validators/apiValidator');
const { categoryValidationRules } = require('../../validators/categoryValidator');

const adminOnly = apiRole('ADMIN');
router.param('id', idParam);

router.get('/', w(c.list));                                       // публічно
router.get('/:id', w(c.get));                                     // публічно
router.post('/', adminOnly, categoryValidationRules, validate, w(c.create));
router.put('/:id', adminOnly, categoryValidationRules, validate, w(c.update));
router.patch('/:id', adminOnly, mergeBody(c.currentValues), categoryValidationRules, validate, w(c.update));
router.delete('/:id', adminOnly, w(c.remove));

module.exports = router;
