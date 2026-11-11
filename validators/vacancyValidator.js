const { body } = require('express-validator');

const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'REMOTE', 'INTERNSHIP', 'CONTRACT'];
const STATUSES = ['DRAFT', 'OPEN', 'CLOSED'];

exports.vacancyValidationRules = [
  body('title')
    .trim()
    .notEmpty().withMessage("Назва вакансії обов'язкова.")
    .isLength({ min: 3, max: 200 }).withMessage('Назва має бути від 3 до 200 символів.'),

  body('description')
    .trim()
    .notEmpty().withMessage("Опис вакансії обов'язковий.")
    .isLength({ min: 10 }).withMessage('Опис має містити щонайменше 10 символів.'),

  body('salaryMin')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 }).withMessage('Мінімальна зарплата має бути невід\'ємним числом.'),

  body('salaryMax')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 }).withMessage('Максимальна зарплата має бути невід\'ємним числом.')
    .custom((value, { req }) => {
      const min = req.body.salaryMin;
      if (min && Number(value) < Number(min)) {
        throw new Error('Максимальна зарплата не може бути меншою за мінімальну.');
      }
      return true;
    }),

  body('currency')
    .optional({ checkFalsy: true })
    .isLength({ min: 3, max: 3 }).withMessage('Код валюти має складатись з 3 літер, напр. UAH.'),

  body('city')
    .optional({ checkFalsy: true })
    .isLength({ max: 100 }).withMessage('Назва міста занадто довга.'),

  body('employmentType')
    .notEmpty().withMessage("Оберіть тип зайнятості.")
    .isIn(EMPLOYMENT_TYPES).withMessage('Некоректний тип зайнятості.'),

  body('status')
    .optional()
    .isIn(STATUSES).withMessage('Некоректний статус вакансії.'),

  body('employerId')
    .notEmpty().withMessage('Оберіть роботодавця.')
    .isInt().withMessage('Некоректний роботодавець.'),

  body('categoryId')
    .notEmpty().withMessage('Оберіть категорію.')
    .isInt().withMessage('Некоректна категорія.'),
];
