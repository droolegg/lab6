const { body } = require('express-validator');

const APPLICATION_STATUSES = ['NEW', 'VIEWED', 'INVITED', 'REJECTED'];

exports.applicationCreateRules = [
  body('vacancyId')
    .notEmpty().withMessage('Не вказано вакансію.')
    .isInt().withMessage('Некоректна вакансія.'),

  // jobSeekerId підставляється з сесії (forceOwnJobSeekerId), а не вводиться користувачем

  body('coverLetter')
    .optional({ checkFalsy: true })
    .isLength({ max: 1500 }).withMessage('Супровідний лист не може перевищувати 1500 символів.'),
];

exports.applicationStatusRules = [
  body('status')
    .notEmpty().withMessage("Статус обов'язковий.")
    .isIn(APPLICATION_STATUSES).withMessage('Некоректний статус відгуку.'),
];
