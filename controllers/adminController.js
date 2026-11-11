// Адмін-панель (Лаб. №5): універсальний CRUD для всіх таблиць системи.
// Доступ закрито на рівні роутера (requireRole('ADMIN')), тому тут перевіряти роль повторно не потрібно.
const prisma = require('../prisma/client');
const { resources } = require('../admin/resources');
const { validateResource, editableFields } = require('../validators/adminValidator');

const PAGE_SIZE = 10;

// ---------- допоміжні функції ----------

function flash(req, type, msg) {
  req.session.flash = { type, msg };
}

// Людське повідомлення замість "сирої" помилки Prisma
function dbErrorMessage(err, action) {
  if (err.code === 'P2002') return 'Запис з такими унікальними даними (email, назва тощо) уже існує.';
  if (err.code === 'P2003') {
    return action === 'delete'
      ? 'Не можна видалити: на цей запис посилаються інші дані (наприклад, у категорії є вакансії).'
      : 'Некоректне посилання на пов’язаний запис.';
  }
  if (err.code === 'P2025') return 'Запис не знайдено — можливо, його вже видалено.';
  return null; // невідома помилка — віддаємо в загальний обробник
}

// Форма запису поля для шаблону: значення, прапорці типу, список варіантів для select
async function buildFormFields(resource, mode, values) {
  const result = [];
  for (const f of resource.fields) {
    const readonly = mode === 'edit' && f.immutable;
    let value = values[f.name];
    if (value === undefined || value === null) value = mode === 'create' && f.defaultValue !== undefined ? f.defaultValue : '';
    if (f.type === 'password') value = ''; // пароль у форму ніколи не повертаємо

    let options = null;
    if (f.type === 'select') {
      options = f.options.map((o) => ({ ...o, selected: String(o.value) === String(value) }));
    } else if (f.type === 'relation') {
      const rows = await prisma[f.model].findMany({ orderBy: f.orderBy || { id: 'asc' } });
      options = rows.map((r) => ({ value: r.id, label: f.optionLabel(r), selected: String(r.id) === String(value) }));
      options.unshift({ value: '', label: f.required ? '— оберіть —' : '— не вибрано —', selected: value === '' });
    }

    result.push({
      name: f.name,
      label: f.label,
      value,
      half: f.half,
      readonly,
      hint: f.passwordField ? (mode === 'edit' ? 'Залиште порожнім, щоб не змінювати пароль.' : 'Мінімум 6 символів.') : null,
      isTextarea: f.type === 'textarea',
      isSelect: f.type === 'select' || f.type === 'relation',
      isPassword: f.type === 'password',
      isNumber: f.type === 'int',
      isText: !['textarea', 'select', 'relation', 'password', 'int'].includes(f.type),
      options,
      required: f.required || (f.passwordField && mode === 'create'),
    });
  }
  return result;
}

// Приведення значень форми до типів Prisma
function toData(resource, body, mode) {
  const data = {};
  for (const f of editableFields(resource, mode)) {
    if (f.passwordField) continue; // пароль обробляється окремо
    const raw = body[f.name];
    const empty = raw === undefined || raw === null || String(raw).trim() === '';
    if (f.type === 'int' || f.type === 'relation') {
      data[f.name] = empty ? (f.type === 'int' && f.defaultValue !== undefined ? f.defaultValue : null) : Number(raw);
    } else if (f.required || f.type === 'select') {
      data[f.name] = f.type === 'textarea' ? String(raw) : String(raw).trim();
    } else {
      data[f.name] = empty ? null : String(raw).trim();
    }
  }
  // поле currency має значення за замовчуванням
  if (resource.key === 'vacancies' && !data.currency) data.currency = 'UAH';
  return data;
}

async function renderForm(res, resource, mode, values, errors, status = 200, id = null) {
  const fields = await buildFormFields(resource, mode, values);
  return res.status(status).render('admin/form', {
    title: mode === 'create' ? `Додати ${resource.singular}` : `Редагування: ${resource.title}`,
    mode,
    isCreate: mode === 'create',
    recordId: id,
    errors,
    fields,
    formAction: mode === 'create' ? `/admin/${resource.key}` : `/admin/${resource.key}/${id}?_method=PUT`,
  });
}

// ---------- дії ----------

// GET /admin — головна сторінка адмін-панелі зі статистикою
exports.dashboard = async (req, res) => {
  const cards = await Promise.all(
    Object.values(resources).map(async (r) => ({
      key: r.key,
      title: r.title,
      count: await prisma[r.model].count(),
    }))
  );
  res.render('admin/dashboard', { title: 'Адмін-панель', cards });
};

// GET /admin/:resource?q=&page=
exports.list = async (req, res) => {
  const resource = req.resource;
  const q = String(req.query.q || '').trim();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);

  const where = q ? { OR: resource.searchFields.map((f) => ({ [f]: { contains: q } })) } : {};
  const total = await prisma[resource.model].count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, totalPages);

  const rows = await prisma[resource.model].findMany({
    where,
    include: resource.include,
    orderBy: resource.orderBy,
    skip: (current - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  res.render('admin/list', {
    title: resource.title,
    q,
    qEncoded: encodeURIComponent(q),
    total,
    columns: resource.columns,
    rows: rows.map((r) => ({
      id: r.id,
      cells: resource.row(r),
      canDelete: !(resource.guardDelete && resource.guardDelete(req, r.id)),
    })),
    pagination: { show: totalPages > 1, page: current, totalPages, hasPrev: current > 1, hasNext: current < totalPages, prev: current - 1, next: current + 1 },
  });
};

// GET /admin/:resource/new
exports.newForm = (req, res) => renderForm(res, req.resource, 'create', {}, []);

// POST /admin/:resource
exports.create = async (req, res, next) => {
  const resource = req.resource;
  const errors = await validateResource(req, 'create');
  if (errors.length) return renderForm(res, resource, 'create', req.body, errors, 400);

  try {
    const data = toData(resource, req.body, 'create');
    if (resource.create) await resource.create({ data, password: req.body.password });
    else await prisma[resource.model].create({ data });
    flash(req, 'success', `Запис додано: ${resource.title.toLowerCase()}.`);
    res.redirect(`/admin/${resource.key}`);
  } catch (err) {
    const msg = dbErrorMessage(err, 'save');
    if (!msg) return next(err);
    return renderForm(res, resource, 'create', req.body, [{ msg }], 400);
  }
};

// GET /admin/:resource/:id/edit
exports.editForm = async (req, res) => {
  const resource = req.resource;
  const record = await prisma[resource.model].findUnique({ where: { id: Number(req.params.id) } });
  if (!record) return res.status(404).render('404', { title: 'Не знайдено' });
  return renderForm(res, resource, 'edit', record, [], 200, record.id);
};

// PUT /admin/:resource/:id
exports.update = async (req, res, next) => {
  const resource = req.resource;
  const id = Number(req.params.id);
  const record = await prisma[resource.model].findUnique({ where: { id } });
  if (!record) return res.status(404).render('404', { title: 'Не знайдено' });

  const errors = await validateResource(req, 'edit');
  if (errors.length) {
    // незмінювані поля (email) беремо з БД, бо у формі вони лише для читання
    return renderForm(res, resource, 'edit', { ...req.body, ...pickImmutable(resource, record) }, errors, 400, id);
  }

  try {
    const data = toData(resource, req.body, 'edit');
    if (resource.update) await resource.update({ id, data, password: req.body.password });
    else await prisma[resource.model].update({ where: { id }, data });
    flash(req, 'success', `Запис №${id} оновлено.`);
    res.redirect(`/admin/${resource.key}`);
  } catch (err) {
    const msg = dbErrorMessage(err, 'save');
    if (!msg) return next(err);
    return renderForm(res, resource, 'edit', { ...req.body, ...pickImmutable(resource, record) }, [{ msg }], 400, id);
  }
};

function pickImmutable(resource, record) {
  const out = {};
  resource.fields.filter((f) => f.immutable).forEach((f) => { out[f.name] = record[f.name]; });
  return out;
}

// DELETE /admin/:resource/:id
exports.delete = async (req, res, next) => {
  const resource = req.resource;
  const id = Number(req.params.id);

  const blocked = resource.guardDelete && resource.guardDelete(req, id);
  if (blocked) {
    flash(req, 'error', blocked);
    return res.redirect(`/admin/${resource.key}`);
  }

  try {
    await prisma[resource.model].delete({ where: { id } });
    flash(req, 'success', `Запис №${id} видалено.`);
  } catch (err) {
    const msg = dbErrorMessage(err, 'delete');
    if (!msg) return next(err);
    flash(req, 'error', msg);
  }
  res.redirect(`/admin/${resource.key}`);
};
