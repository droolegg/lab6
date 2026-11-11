// Динамічна валідація для адмін-панелі: правила будуються з опису полів у admin/resources.js
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma/client');

// Поля, які редагуються у формі (на редагуванні "immutable" поля пропускаємо)
function editableFields(resource, mode) {
  return resource.fields.filter((f) => !(mode === 'edit' && f.immutable));
}

function chainFor(field, resource, mode, id) {
  const chain = body(field.name);
  const label = field.label;
  const required = field.required || (field.passwordField && mode === 'create');

  // текст обрізаємо, але не пароль і не багаторядкові поля
  if (field.type !== 'textarea' && field.type !== 'password') chain.trim();
  if (field.type === 'email') chain.toLowerCase();

  if (required) {
    chain.notEmpty().withMessage(`Поле «${label}» обов'язкове.`).bail();
  } else {
    chain.optional({ checkFalsy: true });
  }

  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'password': {
      if (field.min || field.max) {
        const msg = field.minMsg
          || (field.min && field.max ? `Поле «${label}»: від ${field.min} до ${field.max} символів.`
            : field.min ? `Поле «${label}»: щонайменше ${field.min} символів.`
            : `Поле «${label}»: не більше ${field.max} символів.`);
        chain.isLength({ min: field.min || 0, max: field.max || undefined }).withMessage(msg);
      }
      if (field.pattern) chain.matches(field.pattern).withMessage(field.patternMsg);
      break;
    }
    case 'email':
      chain.isEmail().withMessage('Введіть коректний email.');
      break;
    case 'url':
      chain.isURL({ require_protocol: false }).withMessage('Введіть коректну адресу сайту.');
      break;
    case 'int':
      chain.isInt({ min: field.intMin, max: field.intMax }).withMessage(
        `Поле «${label}» має бути цілим числом${field.intMin !== undefined ? ` від ${field.intMin}` : ''}${field.intMax !== undefined ? ` до ${field.intMax}` : ''}.`
      );
      break;
    case 'select':
      chain.isIn(field.options.map((o) => o.value)).withMessage(`Некоректне значення поля «${label}».`);
      break;
    case 'relation':
      chain
        .isInt().withMessage(`Некоректне значення поля «${label}».`).bail()
        .custom(async (value) => {
          const found = await prisma[field.model].findUnique({ where: { id: Number(value) } });
          if (!found) throw new Error(`Обраний запис у полі «${label}» не існує.`);
          return true;
        });
      break;
  }

  // Унікальність (перевіряємо в усіх зазначених таблицях, на редагуванні — крім самого запису)
  if (field.unique) {
    chain.custom(async (value) => {
      if (!value) return true;
      for (const model of field.uniqueIn || [resource.model]) {
        const where = { [field.name]: value };
        if (mode === 'edit' && model === resource.model) where.NOT = { id: Number(id) };
        const exists = await prisma[model].findFirst({ where });
        if (exists) throw new Error(`Значення «${label}» уже використовується.`);
      }
      return true;
    });
  }
  return chain;
}

// Запускає всі правила, потім міжполеві перевірки; повертає масив помилок [{ msg }]
async function validateResource(req, mode) {
  const resource = req.resource;
  const id = req.params.id;
  const chains = editableFields(resource, mode).map((f) => chainFor(f, resource, mode, id));
  await Promise.all(chains.map((c) => c.run(req)));

  const errors = validationResult(req).array().map((e) => ({ msg: e.msg }));
  if (!errors.length && resource.crossCheck) {
    const extra = await resource.crossCheck(req.body, { req, id, mode });
    extra.forEach((msg) => errors.push({ msg }));
  }
  return errors;
}

module.exports = { validateResource, editableFields };
