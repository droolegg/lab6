const prisma = require('../../prisma/client');
const { canManageVacancy } = require('../../middleware/auth');
const { visibilityWhere } = require('../helpers/vacancyPage');
const {
  ApiError, parsePagination, sendPage, toIntOrNull, toStrOrNull, serializeVacancy, serializeApplication,
} = require('./apiHelpers');

const INCLUDE = { employer: true, category: true, _count: { select: { applications: true } } };
const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'REMOTE', 'INTERNSHIP', 'CONTRACT'];
const STATUSES = ['DRAFT', 'OPEN', 'CLOSED'];
const SORT_FIELDS = ['createdAt', 'salaryMin', 'salaryMax', 'title'];

// GET /api/vacancies — публічний; видимість залежить від ролі (відвідувач бачить лише OPEN)
// Фільтри: ?categoryId= &employerId= &city= &employmentType= &status= &q=
// Сортування: ?sort=createdAt|salaryMin|salaryMax|title &order=asc|desc; сторінки: ?page= &limit=
exports.list = async (req, res) => {
  const pg = parsePagination(req.query);
  const { categoryId, employerId, city, employmentType, status, q } = req.query;

  const filters = [visibilityWhere(req.user)];
  if (categoryId && /^\d+$/.test(categoryId)) filters.push({ categoryId: Number(categoryId) });
  if (employerId && /^\d+$/.test(employerId)) filters.push({ employerId: Number(employerId) });
  if (city) filters.push({ city: { contains: String(city) } });
  if (EMPLOYMENT_TYPES.includes(employmentType)) filters.push({ employmentType });
  if (STATUSES.includes(status)) filters.push({ status }); // накладається на правила видимості
  if (q && String(q).trim()) {
    const term = String(q).trim();
    filters.push({ OR: [{ title: { contains: term } }, { description: { contains: term } }] });
  }
  const where = { AND: filters };

  const sort = SORT_FIELDS.includes(req.query.sort) ? req.query.sort : 'createdAt';
  const order = req.query.order === 'asc' ? 'asc' : 'desc';

  const [total, rows] = await Promise.all([
    prisma.vacancy.count({ where }),
    prisma.vacancy.findMany({ where, include: INCLUDE, orderBy: { [sort]: order }, skip: pg.skip, take: pg.limit }),
  ]);
  sendPage(res, rows.map(serializeVacancy), total, pg);
};

// GET /api/vacancies/:id — чернетки та закриті бачить лише власник або адмін (для інших — 404)
exports.get = async (req, res) => {
  const vacancy = await prisma.vacancy.findUnique({ where: { id: Number(req.params.id) }, include: INCLUDE });
  if (!vacancy || (vacancy.status !== 'OPEN' && !canManageVacancy(req.user, vacancy))) {
    throw new ApiError(404, 'Вакансію не знайдено.');
  }
  res.json(serializeVacancy(vacancy));
};

// Middleware: завантажує вакансію й перевіряє право керування (власник-роботодавець або адмін)
exports.loadManaged = async (req, res, next) => {
  try {
    const vacancy = await prisma.vacancy.findUnique({ where: { id: Number(req.params.id) } });
    if (!vacancy) throw new ApiError(404, 'Вакансію не знайдено.');
    if (!canManageVacancy(req.user, vacancy)) throw new ApiError(403, 'Ви не можете керувати цією вакансією.');
    req.vacancy = vacancy;
    next();
  } catch (err) {
    next(err);
  }
};

// Поточні значення вакансії — для PATCH
exports.currentValues = (req) => {
  const v = req.vacancy;
  return {
    title: v.title, description: v.description, salaryMin: v.salaryMin, salaryMax: v.salaryMax,
    currency: v.currency, city: v.city, employmentType: v.employmentType, status: v.status,
    employerId: v.employerId, categoryId: v.categoryId,
  };
};

const buildData = (b) => ({
  title: b.title,
  description: b.description,
  salaryMin: toIntOrNull(b.salaryMin),
  salaryMax: toIntOrNull(b.salaryMax),
  currency: toStrOrNull(b.currency) || 'UAH',
  city: toStrOrNull(b.city),
  employmentType: b.employmentType,
  ...(b.status ? { status: b.status } : {}),
  employerId: Number(b.employerId),
  categoryId: Number(b.categoryId),
});

// POST /api/vacancies (EMPLOYER — від свого імені, ADMIN — від імені будь-якого роботодавця) → 201
exports.create = async (req, res) => {
  const vacancy = await prisma.vacancy.create({ data: buildData(req.body), include: INCLUDE });
  res.status(201).location(`/api/vacancies/${vacancy.id}`).json(serializeVacancy(vacancy));
};

// PUT|PATCH /api/vacancies/:id
exports.update = async (req, res) => {
  const vacancy = await prisma.vacancy.update({
    where: { id: req.vacancy.id },
    data: buildData(req.body),
    include: INCLUDE,
  });
  res.json(serializeVacancy(vacancy));
};

// DELETE /api/vacancies/:id → 204 (відгуки на вакансію видаляються каскадно)
exports.remove = async (req, res) => {
  await prisma.vacancy.delete({ where: { id: req.vacancy.id } });
  res.status(204).end();
};

// GET /api/vacancies/:id/applications — відгуки на вакансію (власник або адмін)
exports.applications = async (req, res) => {
  const pg = parsePagination(req.query);
  const where = { vacancyId: req.vacancy.id };
  const [total, rows] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where, include: { jobSeeker: true }, orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.limit,
    }),
  ]);
  sendPage(res, rows.map(serializeApplication), total, pg);
};
