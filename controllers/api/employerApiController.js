const prisma = require('../../prisma/client');
const { ApiError, parsePagination, sendPage, serializeEmployer } = require('./apiHelpers');
const { createEmployerAccount, employerData } = require('./authApiController');

const INCLUDE = { _count: { select: { vacancies: true } } };

// Роботодавець бачить і змінює лише власний профіль; адміністратор — будь-який
const canAccess = (user, id) => user.role === 'ADMIN' || (user.role === 'EMPLOYER' && user.employerId === id);

// Middleware: перевірка доступу до профілю за :id
exports.requireSelfOrAdmin = (req, res, next) => {
  if (!canAccess(req.user, Number(req.params.id))) {
    return next(new ApiError(403, 'Доступ лише до власного профілю (або адміністратор).'));
  }
  next();
};

// GET /api/employers?q=&page=&limit= (ADMIN)
exports.list = async (req, res) => {
  const pg = parsePagination(req.query);
  const q = String(req.query.q || '').trim();
  const where = q ? { OR: [{ companyName: { contains: q } }, { email: { contains: q } }, { city: { contains: q } }] } : {};
  const [total, rows] = await Promise.all([
    prisma.employer.count({ where }),
    prisma.employer.findMany({ where, include: INCLUDE, orderBy: { id: 'asc' }, skip: pg.skip, take: pg.limit }),
  ]);
  sendPage(res, rows.map(serializeEmployer), total, pg);
};

// GET /api/employers/:id (власник або ADMIN)
exports.get = async (req, res) => {
  const employer = await prisma.employer.findUnique({ where: { id: Number(req.params.id) }, include: INCLUDE });
  if (!employer) throw new ApiError(404, 'Роботодавця не знайдено.');
  res.json(serializeEmployer(employer));
};

// Поточні значення — для PATCH
exports.currentValues = async (req) => {
  const e = await prisma.employer.findUnique({ where: { id: Number(req.params.id) } });
  if (!e) throw new ApiError(404, 'Роботодавця не знайдено.');
  return { companyName: e.companyName, phone: e.phone, website: e.website, city: e.city, description: e.description };
};

// POST /api/employers (ADMIN) { email, password, companyName, ... } → 201
exports.create = async (req, res) => {
  const user = await createEmployerAccount(req.body);
  res.status(201).location(`/api/employers/${user.employerId}`).json(serializeEmployer(user.employer));
};

// PUT|PATCH /api/employers/:id (email змінити не можна — це логін)
exports.update = async (req, res) => {
  const id = Number(req.params.id);
  if (!(await prisma.employer.findUnique({ where: { id } }))) throw new ApiError(404, 'Роботодавця не знайдено.');
  const employer = await prisma.employer.update({ where: { id }, data: employerData(req.body), include: INCLUDE });
  res.json(serializeEmployer(employer));
};

// DELETE /api/employers/:id (ADMIN) → 204; каскадно видаляє вакансії, відгуки й обліковий запис
exports.remove = async (req, res) => {
  const id = Number(req.params.id);
  if (!(await prisma.employer.findUnique({ where: { id } }))) throw new ApiError(404, 'Роботодавця не знайдено.');
  await prisma.employer.delete({ where: { id } });
  res.status(204).end();
};
