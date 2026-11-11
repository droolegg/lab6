// Express 4 не вміє ловити помилки з async-обробників: необроблена відмова проміса
// (наприклад, помилка бази) завершує весь процес Node — і сайт «падає» для всіх.
// Цей патч передає такі помилки в звичайний error handler Express, тож сервер
// відповідає сторінкою помилки й продовжує працювати.
const Layer = require('express/lib/router/layer');

Layer.prototype.handle_request = function handle(req, res, next) {
  const fn = this.handle;
  if (fn.length > 3) return next(); // це error handler — пропускаємо
  try {
    const result = fn(req, res, next);
    if (result && typeof result.catch === 'function') result.catch(next);
  } catch (err) {
    next(err);
  }
};
