const express = require('express');
const router = express.Router();
const c = require('../../controllers/api/applicationApiController');
const { apiAuth, apiRole, idParam } = require('../../middleware/apiAuth');
const { asyncHandler: w } = require('../../controllers/api/apiHelpers');
const { validate } = require('../../validators/apiValidator');
const { applicationCreateRules, applicationStatusRules } = require('../../validators/applicationValidator');

router.param('id', idParam);

router.get('/', apiAuth, w(c.list));                              // кожен бачить лише свої відгуки
router.get('/:id', apiAuth, w(c.get));
router.post('/', apiRole('JOB_SEEKER'), applicationCreateRules, validate, w(c.create));
router.put('/:id', apiRole('EMPLOYER', 'ADMIN'), applicationStatusRules, validate, w(c.updateStatus));
router.patch('/:id', apiRole('EMPLOYER', 'ADMIN'), applicationStatusRules, validate, w(c.updateStatus));
router.delete('/:id', apiRole('JOB_SEEKER', 'ADMIN'), w(c.remove));

module.exports = router;
