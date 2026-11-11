// Ролі: ADMIN, EMPLOYER, JOB_SEEKER; неавторизований користувач = відвідувач (VISITOR).
const ROLE_LABELS = {
  ADMIN: 'Адміністратор',
  EMPLOYER: 'Роботодавець',
  JOB_SEEKER: 'Шукач роботи',
  VISITOR: 'Відвідувач',
};

function renderForbidden(req, res) {
  return res.status(403).render('403', { title: 'Доступ заборонено' });
}

// Потрібна авторизація (будь-яка роль). Інакше — 401 і сторінка входу.
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  if (req.method === 'GET') req.session.returnTo = req.originalUrl;
  return res.status(401).render('auth/login', {
    title: 'Вхід',
    errors: [{ msg: 'Для доступу до цієї сторінки потрібно увійти.' }],
  });
}

// Лише для гостей (вхід/реєстрація недоступні вже авторизованим)
function ensureGuest(req, res, next) {
  if (!req.isAuthenticated()) return next();
  return res.redirect('/');
}

// Потрібна одна з перелічених ролей. Неавторизований → 401 (на вхід), не та роль → 403.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.isAuthenticated()) return ensureAuth(req, res, next);
    if (!roles.includes(req.user.role)) return renderForbidden(req, res);
    return next();
  };
}

// Чи може користувач керувати (редагувати/видаляти) вакансією
function canManageVacancy(user, vacancy) {
  if (!user || !vacancy) return false;
  if (user.role === 'ADMIN') return true;
  return user.role === 'EMPLOYER' && vacancy.employerId === user.employerId;
}

module.exports = { ROLE_LABELS, ensureAuth, ensureGuest, requireRole, canManageVacancy, renderForbidden };
