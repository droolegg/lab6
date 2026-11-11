// Захист REST API: на відміну від веб-сторінок, відповіді — JSON (без HTML-форм).
// Автентифікація — та сама сесія Passport (cookie), яку створює POST /api/auth/login.
const { ApiError } = require('../controllers/api/apiHelpers');

// Потрібна авторизація (будь-яка роль) → інакше 401
function apiAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  return next(new ApiError(401, 'Потрібна автентифікація: виконайте POST /api/auth/login.'));
}

// Потрібна одна з ролей: не авторизований → 401, не та роль → 403
function apiRole(...roles) {
  return (req, res, next) => {
    if (!req.isAuthenticated()) return apiAuth(req, res, next);
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, `Недостатньо прав: потрібна роль ${roles.join(' або ')}.`));
    }
    return next();
  };
}

// :id у URL має бути цілим числом, інакше 404
function idParam(req, res, next, id) {
  if (!/^\d+$/.test(id)) return next(new ApiError(404, 'Ресурс не знайдено.'));
  return next();
}

// Для PATCH: підставляємо поточні значення запису під поля, яких немає в тілі,
// тоді ті самі правила валідації, що й для PUT, працюють і для часткового оновлення.
// getBase може бути асинхронною (читає запис із БД).
const mergeBody = (getBase) => async (req, res, next) => {
  try {
    const base = await getBase(req);
    req.body = { ...base, ...(req.body && typeof req.body === 'object' ? req.body : {}) };
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { apiAuth, apiRole, idParam, mergeBody };
