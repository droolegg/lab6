const express = require('express');
const router = express.Router();
const c = require('../../controllers/api/employerApiController');
const { apiRole, idParam, mergeBody } = require('../../middleware/apiAuth');
const { asyncHandler: w } = require('../../controllers/api/apiHelpers');
const { validate, apiAccountRules } = require('../../validators/apiValidator');
const { employerProfileRules } = require('../../validators/employerValidator');

const adminOnly = apiRole('ADMIN');
const selfOrAdmin = [apiRole('ADMIN', 'EMPLOYER'), c.requireSelfOrAdmin];
router.param('id', idParam);

router.get('/', adminOnly, w(c.list));
router.get('/:id', ...selfOrAdmin, w(c.get));
router.post('/', adminOnly, apiAccountRules, employerProfileRules, validate, w(c.create));
router.put('/:id', ...selfOrAdmin, employerProfileRules, validate, w(c.update));
router.patch('/:id', ...selfOrAdmin, mergeBody(c.currentValues), employerProfileRules, validate, w(c.update));
router.delete('/:id', adminOnly, w(c.remove));

module.exports = router;
