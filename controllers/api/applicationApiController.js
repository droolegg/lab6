const prisma = require('../../prisma/client');
const { canManageVacancy } = require('../../middleware/auth');
const { ApiError, parsePagination, sendPage, serializeApplication } = require('./apiHelpers');

const INCLUDE = { vacancy: true, jobSeeker: true };
const STATUSES = ['NEW', 'VIEWED', 'INVITED', 'REJECTED'];

// Кожна роль бачить лише «свої» відгуки: шукач — власні, роботодавець — на свої вакансії, адмін — усі
function scopeWhere(user) {
  if (user.role === 'ADMIN') return {};
  if (user.role === 'EMPLOYER') return { vacancy: { employerId: user.employerId } };
  return { jobSeekerId: user.jobSeekerId };
}

// GET /api/applications?vacancyId=&status=&page=&limit=
exports.list = async (req, res) => {
  const pg = parsePagination(req.query);
  const filters = [scopeWhere(req.user)];
  if (req.query.vacancyId && /^\d+$/.test(req.query.vacancyId)) filters.push({ vacancyId: Number(req.query.vacancyId) });
  if (STATUSES.includes(req.query.status)) filters.push({ status: req.query.status });
  const where = { AND: filters };

  const [total, rows] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.limit }),
  ]);
  sendPage(res, rows.map(serializeApplication), total, pg);
};

// Завантажує відгук і перевіряє доступ: автор, роботодавець вакансії або адмін
async function loadAccessible(req) {
  const application = await prisma.application.findUnique({ where: { id: Number(req.params.id) }, include: INCLUDE });
  if (!application) throw new ApiError(404, 'Відгук не знайдено.');
  const u = req.user;
  const isOwner = u.role === 'JOB_SEEKER' && application.jobSeekerId === u.jobSeekerId;
  if (!isOwner && !canManageVacancy(u, application.vacancy)) throw new ApiError(403, 'Немає доступу до цього відгуку.');
  return { application, isOwner };
}

// GET /api/applications/:id
exports.get = async (req, res) => {
  const { application } = await loadAccessible(req);
  res.json(serializeApplication(application));
};

// POST /api/applications { vacancyId, coverLetter } (JOB_SEEKER) → 201; id шукача береться із сесії
exports.create = async (req, res) => {
  const vacancyId = Number(req.body.vacancyId);
  const vacancy = await prisma.vacancy.findUnique({ where: { id: vacancyId } });
  if (!vacancy) throw new ApiError(404, 'Вакансію не знайдено.');
  if (vacancy.status !== 'OPEN') throw new ApiError(400, 'Відгукнутися можна лише на відкриту вакансію.');

  const exists = await prisma.application.findUnique({
    where: { vacancyId_jobSeekerId: { vacancyId, jobSeekerId: req.user.jobSeekerId } },
  });
  if (exists) throw new ApiError(409, 'Ви вже подали відгук на цю вакансію.');

  const application = await prisma.application.create({
    data: { vacancyId, jobSeekerId: req.user.jobSeekerId, coverLetter: req.body.coverLetter || null },
    include: INCLUDE,
  });
  res.status(201).location(`/api/applications/${application.id}`).json(serializeApplication(application));
};

// PUT|PATCH /api/applications/:id { status } — змінює статус роботодавець вакансії або адмін
exports.updateStatus = async (req, res) => {
  const application = await prisma.application.findUnique({ where: { id: Number(req.params.id) }, include: INCLUDE });
  if (!application) throw new ApiError(404, 'Відгук не знайдено.');
  if (!canManageVacancy(req.user, application.vacancy)) throw new ApiError(403, 'Змінювати статус може лише роботодавець цієї вакансії або адміністратор.');
  const updated = await prisma.application.update({
    where: { id: application.id }, data: { status: req.body.status }, include: INCLUDE,
  });
  res.json(serializeApplication(updated));
};

// DELETE /api/applications/:id (автор відгуку або адмін) → 204
exports.remove = async (req, res) => {
  const application = await prisma.application.findUnique({ where: { id: Number(req.params.id) } });
  if (!application) throw new ApiError(404, 'Відгук не знайдено.');
  const isOwner = req.user.role === 'JOB_SEEKER' && application.jobSeekerId === req.user.jobSeekerId;
  if (!isOwner && req.user.role !== 'ADMIN') throw new ApiError(403, 'Видалити відгук може лише його автор або адміністратор.');
  await prisma.application.delete({ where: { id: application.id } });
  res.status(204).end();
};
