const { body } = require('express-validator');

exports.employerProfileRules = [
  body('companyName')
    .trim()
    .notEmpty().withMessage("Назва компанії обов'язкова.")
    .isLength({ min: 2, max: 150 }).withMessage('Назва компанії має бути від 2 до 150 символів.'),

  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[0-9+\-() ]{6,20}$/).withMessage('Телефон має містити лише цифри, пробіли та символи + - ( ).'),

  body('website')
    .optional({ checkFalsy: true })
    .isURL({ require_protocol: false }).withMessage('Введіть коректну адресу сайту.'),

  body('city')
    .optional({ checkFalsy: true })
    .isLength({ max: 100 }).withMessage('Назва міста занадто довга.'),

  body('description')
    .optional({ checkFalsy: true })
    .isLength({ max: 1000 }).withMessage('Опис не може перевищувати 1000 символів.'),
];
