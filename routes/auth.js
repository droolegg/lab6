const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');
const { ensureAuth, ensureGuest } = require('../middleware/auth');
const { loginRules, accountRules } = require('../validators/authValidator');
const { employerProfileRules } = require('../validators/employerValidator');
const { jobSeekerProfileRules } = require('../validators/jobSeekerValidator');

// Вхід / вихід (вхід і реєстрація — лише для гостей)
router.get('/login', ensureGuest, controller.loginForm);
router.post('/login', ensureGuest, loginRules, controller.login);
router.post('/logout', ensureAuth, controller.logout);

// Реєстрація: роль визначається маршрутом, а не полем форми
router.get('/register', ensureGuest, controller.registerChoice);
router.get('/register/employer', ensureGuest, controller.employerForm);
router.post('/register/employer', ensureGuest, accountRules, employerProfileRules, controller.employerRegister);
router.get('/register/jobseeker', ensureGuest, controller.jobSeekerForm);
router.post('/register/jobseeker', ensureGuest, accountRules, jobSeekerProfileRules, controller.jobSeekerRegister);

// Особистий кабінет — будь-яка авторизована роль
router.get('/profile', ensureAuth, controller.profile);

module.exports = router;
