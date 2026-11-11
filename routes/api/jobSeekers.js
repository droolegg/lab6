const express = require('express');
const router = express.Router();
const c = require('../../controllers/api/jobSeekerApiController');
const { apiRole, idParam, mergeBody } = require('../../middleware/apiAuth');
const { asyncHandler: w } = require('../../controllers/api/apiHelpers');
const { validate, apiAccountRules } = require('../../validators/apiValidator');
const { jobSeekerProfileRules } = require('../../validators/jobSeekerValidator');

const adminOnly = apiRole('ADMIN');
const selfOrAdmin = [apiRole('ADMIN', 'JOB_SEEKER'), c.requireSelfOrAdmin];
router.param('id', idParam);

router.get('/', apiRole('ADMIN', 'EMPLOYER'), w(c.list));
router.get('/:id', ...selfOrAdmin, w(c.get));
router.post('/', adminOnly, apiAccountRules, jobSeekerProfileRules, validate, w(c.create));
router.put('/:id', ...selfOrAdmin, jobSeekerProfileRules, validate, w(c.update));
router.patch('/:id', ...selfOrAdmin, mergeBody(c.currentValues), jobSeekerProfileRules, validate, w(c.update));
router.delete('/:id', adminOnly, w(c.remove));

module.exports = router;
