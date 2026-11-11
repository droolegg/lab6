// RESTful API (Лаб. №6). Базовий шлях: /api. Формат — JSON.
const express = require('express');
const router = express.Router();
const { ApiError } = require('../../controllers/api/apiHelpers');

// API не кешується (відповіді залежать від ролі користувача)
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// GET /api — короткий опис API (корисно для перевірки, що сервер працює)
router.get('/', (req, res) => {
  res.json({
    name: 'Vacancies REST API',
    version: '1.0',
    auth: 'сесія (cookie): POST /api/auth/login',
    tester: '/api-tester.html',
    resources: {
      auth: ['POST /api/auth/login', 'POST /api/auth/logout', 'GET /api/auth/me',
        'POST /api/auth/register/employer', 'POST /api/auth/register/jobseeker'],
      categories: '/api/categories',
      vacancies: '/api/vacancies',
      applications: '/api/applications',
      employers: '/api/employers',
      jobseekers: '/api/jobseekers',
    },
  });
});

router.use('/auth', require('./auth'));
router.use('/categories', require('./categories'));
router.use('/vacancies', require('./vacancies'));
router.use('/applications', require('./applications'));
router.use('/employers', require('./employers'));
router.use('/jobseekers', require('./jobSeekers'));

// Невідомий маршрут API → JSON 404 (а не HTML-сторінка)
router.use((req, res, next) => next(new ApiError(404, `Маршрут ${req.method} ${req.originalUrl} не існує.`)));

module.exports = router;
