const { body } = require('express-validator');

exports.categoryValidationRules = [
  body('name')
    .trim()
    .notEmpty().withMessage("Назва категорії обов'язкова.")
    .isLength({ min: 2, max: 100 }).withMessage('Назва має бути від 2 до 100 символів.'),

  body('description')
    .optional({ checkFalsy: true })
    .isLength({ max: 500 }).withMessage('Опис не може перевищувати 500 символів.'),
];
