const express = require('express');
const router = express.Router();
const c = require('../../controllers/api/authApiController');
const { apiAuth } = require('../../middleware/apiAuth');
const { asyncHandler: w } = require('../../controllers/api/apiHelpers');
const { validate, loginRules, apiAccountRules } = require('../../validators/apiValidator');
const { employerProfileRules } = require('../../validators/employerValidator');
const { jobSeekerProfileRules } = require('../../validators/jobSeekerValidator');

router.post('/login', loginRules, validate, c.login);
router.post('/logout', apiAuth, c.logout);
router.get('/me', apiAuth, c.me);

// Реєстрація: роль визначає маршрут, а не поле в тілі запиту
router.post('/register/employer', apiAccountRules, employerProfileRules, validate, w(c.registerEmployer));
router.post('/register/jobseeker', apiAccountRules, jobSeekerProfileRules, validate, w(c.registerJobSeeker));

module.exports = router;
