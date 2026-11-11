const { body } = require('express-validator');
const prisma = require('../prisma/client');

const loginRules = [
  body('email').trim().notEmpty().withMessage("Email обов'язковий.").isEmail().withMessage('Введіть коректний email.'),
  body('password').notEmpty().withMessage("Пароль обов'язковий."),
];

// Спільні правила облікового запису (email + пароль) для обох типів реєстрації
const accountRules = [
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
    .notEmpty().withMessage("Пароль обов'язковий.")
    .isLength({ min: 6 }).withMessage('Пароль має містити щонайменше 6 символів.'),

  body('passwordConfirm')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Паролі не збігаються.'),
];

module.exports = { loginRules, accountRules };
