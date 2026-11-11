const { body } = require('express-validator');

exports.jobSeekerProfileRules = [
  body('firstName')
    .trim()
    .notEmpty().withMessage("Ім'я обов'язкове.")
    .isLength({ min: 2, max: 80 }).withMessage("Ім'я має бути від 2 до 80 символів."),

  body('lastName')
    .trim()
    .notEmpty().withMessage("Прізвище обов'язкове.")
    .isLength({ min: 2, max: 80 }).withMessage('Прізвище має бути від 2 до 80 символів.'),

  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[0-9+\-() ]{6,20}$/).withMessage('Телефон має містити лише цифри, пробіли та символи + - ( ).'),

  body('city')
    .optional({ checkFalsy: true })
    .isLength({ max: 100 }).withMessage('Назва міста занадто довга.'),

  body('desiredPosition')
    .optional({ checkFalsy: true })
    .isLength({ max: 150 }).withMessage('Назва посади занадто довга.'),

  body('experienceYears')
    .optional({ checkFalsy: true })
    .isInt({ min: 0, max: 60 }).withMessage('Досвід має бути числом від 0 до 60.'),

  body('resume')
    .optional({ checkFalsy: true })
    .isLength({ max: 3000 }).withMessage('Резюме не може перевищувати 3000 символів.'),
];
