const prisma = require('../../prisma/client');
const { ApiError, parsePagination, sendPage, serializeJobSeeker } = require('./apiHelpers');
const { createJobSeekerAccount, jobSeekerData } = require('./authApiController');

const INCLUDE = { _count: { select: { applications: true } } };

// Шукач бачить і змінює лише власний профіль; адміністратор — будь-який
const canAccess = (user, id) => user.role === 'ADMIN' || (user.role === 'JOB_SEEKER' && user.jobSeekerId === id);

exports.requireSelfOrAdmin = (req, res, next) => {
  if (!canAccess(req.user, Number(req.params.id))) {
    return next(new ApiError(403, 'Доступ лише до власного профілю (або адміністратор).'));
  }
  next();
};

// GET /api/jobseekers?q=&page=&limit= (ADMIN, EMPLOYER)
exports.list = async (req, res) => {
  const pg = parsePagination(req.query);
  const q = String(req.query.q || '').trim();
  const where = q
    ? { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { email: { contains: q } }, { desiredPosition: { contains: q } }] }
    : {};
  const [total, rows] = await Promise.all([
    prisma.jobSeeker.count({ where }),
    prisma.jobSeeker.findMany({ where, include: INCLUDE, orderBy: { id: 'asc' }, skip: pg.skip, take: pg.limit }),
  ]);
  sendPage(res, rows.map(serializeJobSeeker), total, pg);
};

// GET /api/jobseekers/:id (власник або ADMIN)
exports.get = async (req, res) => {
  const jobSeeker = await prisma.jobSeeker.findUnique({ where: { id: Number(req.params.id) }, include: INCLUDE });
  if (!jobSeeker) throw new ApiError(404, 'Шукача роботи не знайдено.');
  res.json(serializeJobSeeker(jobSeeker));
};

exports.currentValues = async (req) => {
  const j = await prisma.jobSeeker.findUnique({ where: { id: Number(req.params.id) } });
  if (!j) throw new ApiError(404, 'Шукача роботи не знайдено.');
  return {
    firstName: j.firstName, lastName: j.lastName, phone: j.phone, city: j.city,
    desiredPosition: j.desiredPosition, experienceYears: j.experienceYears, resume: j.resume,
  };
};

// POST /api/jobseekers (ADMIN) → 201
exports.create = async (req, res) => {
  const user = await createJobSeekerAccount(req.body);
  res.status(201).location(`/api/jobseekers/${user.jobSeekerId}`).json(serializeJobSeeker(user.jobSeeker));
};

// PUT|PATCH /api/jobseekers/:id
exports.update = async (req, res) => {
  const id = Number(req.params.id);
  if (!(await prisma.jobSeeker.findUnique({ where: { id } }))) throw new ApiError(404, 'Шукача роботи не знайдено.');
  const jobSeeker = await prisma.jobSeeker.update({ where: { id }, data: jobSeekerData(req.body), include: INCLUDE });
  res.json(serializeJobSeeker(jobSeeker));
};

// DELETE /api/jobseekers/:id (ADMIN) → 204
exports.remove = async (req, res) => {
  const id = Number(req.params.id);
  if (!(await prisma.jobSeeker.findUnique({ where: { id } }))) throw new ApiError(404, 'Шукача роботи не знайдено.');
  await prisma.jobSeeker.delete({ where: { id } });
  res.status(204).end();
};
