const express = require('express');
const router = express.Router();
const controller = require('../controllers/adminController');
const { requireRole } = require('../middleware/auth');
const { resources } = require('../admin/resources');

// Уся адмін-панель — захищена область: лише роль ADMIN.
// Відвідувач отримає 401 (форма входу), інші ролі — 403.
router.use(requireRole('ADMIN'));

// Адмінка містить персональні дані — не кешуємо сторінки в браузері
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Одноразові повідомлення (flash) та меню таблиць для всіх сторінок адмінки
router.use((req, res, next) => {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.adminMenu = Object.values(resources).map((r) => ({ key: r.key, title: r.title }));
  next();
});

// :resource → описується в admin/resources.js; невідома таблиця → 404
router.param('resource', (req, res, next, key) => {
  const resource = resources[key];
  if (!resource) return res.status(404).render('404', { title: 'Не знайдено' });
  req.resource = resource;
  res.locals.resource = { key: resource.key, title: resource.title, singular: resource.singular, deleteWarning: resource.deleteWarning };
  res.locals.adminMenu = res.locals.adminMenu.map((m) => ({ ...m, active: m.key === key }));
  next();
});

// Express 4 не ловить помилки async-обробників — передаємо їх у загальний error handler
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// :id має бути цілим числом, інакше 404 (замість помилки Prisma)
router.param('id', (req, res, next, id) => {
  if (!/^\d+$/.test(id)) return res.status(404).render('404', { title: 'Не знайдено' });
  next();
});

router.get('/', wrap(controller.dashboard));
router.get('/:resource', wrap(controller.list));
router.get('/:resource/new', wrap(controller.newForm));
router.post('/:resource', wrap(controller.create));
router.get('/:resource/:id/edit', wrap(controller.editForm));
router.put('/:resource/:id', wrap(controller.update));
router.delete('/:resource/:id', wrap(controller.delete));

module.exports = router;
