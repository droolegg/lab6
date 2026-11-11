const { body, validationResult } = require('express-validator');
const prisma = require('../prisma/client');
const { ApiError } = require('../controllers/api/apiHelpers');

// Завершує ланцюжок правил: якщо є помилки → 400 з переліком { field, message }
function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
  return next(new ApiError(400, 'Помилка валідації даних.', details));
}

// Обліковий запис (email + пароль) для POST /api/auth/register/* та POST /api/employers|jobseekers
const apiAccountRules = [
  body('email')
    .trim()
    .toLowerCase()
    .notEmpty().withMessage("Email обов'язковий.")
    .isEmail().withMessage('Введіть коректний email.')
    .custom(async (email) => {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) throw new Error('Користувач з таким email вже зареєстрований.');
      return true;
    }),
  body('password')
    .isString().withMessage("Пароль обов'язковий.")
    .isLength({ min: 6 }).withMessage('Пароль має містити щонайменше 6 символів.'),
];

const loginRules = [
  body('email').trim().notEmpty().withMessage("Email обов'язковий.").isEmail().withMessage('Введіть коректний email.'),
  body('password').notEmpty().withMessage("Пароль обов'язковий."),
];

// Пов'язані записи вакансії мають існувати (інакше 400, а не помилка БД)
const vacancyRefRules = [
  body('employerId').custom(async (value) => {
    if (!/^\d+$/.test(String(value))) return true; // формат уже перевірено правилом isInt
    if (!(await prisma.employer.findUnique({ where: { id: Number(value) } }))) throw new Error('Роботодавця з таким id не існує.');
    return true;
  }),
  body('categoryId').custom(async (value) => {
    if (!/^\d+$/.test(String(value))) return true;
    if (!(await prisma.category.findUnique({ where: { id: Number(value) } }))) throw new Error('Категорії з таким id не існує.');
    return true;
  }),
];

module.exports = { validate, apiAccountRules, loginRules, vacancyRefRules };
