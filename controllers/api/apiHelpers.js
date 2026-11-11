// Спільні допоміжні функції REST API: помилки, пагінація, серіалізація (без passwordHash!)

// Помилка з HTTP-статусом; обробляється в apiErrorHandler
class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Express 4 не ловить помилки async-обробників — передаємо їх у error handler
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ?page=1&limit=10 (limit не більше 100)
function parsePagination(query, defaultLimit = 10, maxLimit = 100) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

// Список у єдиному форматі: { data: [...], meta: { page, limit, total, totalPages } }
function sendPage(res, data, total, { page, limit }) {
  res.json({ data, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
}

// Порожнє значення → null, інакше число
const toIntOrNull = (v) => (v === undefined || v === null || v === '' ? null : Number(v));
const toStrOrNull = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());

// Єдиний формат відповіді з помилкою:
// { error: { status, message, details?: [{ field, message }] } }
function apiErrorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message;
  let details = err.details;

  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Некоректний JSON у тілі запиту.';
  } else if (err.code === 'P2002') {
    status = 409;
    message = 'Запис з такими унікальними даними (email, назва тощо) уже існує.';
  } else if (err.code === 'P2003') {
    status = 409;
    message = 'Операцію неможливо виконати: запис пов’язаний з іншими даними.';
  } else if (err.code === 'P2025') {
    status = 404;
    message = 'Запис не знайдено.';
  } else if (!(err instanceof ApiError) && status >= 500) {
    console.error(err);
    status = 500;
    message = 'Внутрішня помилка сервера.';
  }

  res.status(status).json({ error: { status, message, ...(details ? { details } : {}) } });
}

// ---------- серіалізатори: віддаємо лише потрібні поля ----------

const serializeCategory = (c) => ({
  id: c.id,
  name: c.name,
  description: c.description,
  ...(c._count ? { vacanciesCount: c._count.vacancies } : {}),
});

const serializeVacancy = (v) => ({
  id: v.id,
  title: v.title,
  description: v.description,
  salaryMin: v.salaryMin,
  salaryMax: v.salaryMax,
  currency: v.currency,
  city: v.city,
  employmentType: v.employmentType,
  status: v.status,
  createdAt: v.createdAt,
  updatedAt: v.updatedAt,
  employerId: v.employerId,
  categoryId: v.categoryId,
  ...(v.employer ? { employer: { id: v.employer.id, companyName: v.employer.companyName, city: v.employer.city } } : {}),
  ...(v.category ? { category: { id: v.category.id, name: v.category.name } } : {}),
  ...(v._count ? { applicationsCount: v._count.applications } : {}),
});

const serializeEmployer = (e) => ({
  id: e.id,
  companyName: e.companyName,
  email: e.email,
  phone: e.phone,
  website: e.website,
  city: e.city,
  description: e.description,
  createdAt: e.createdAt,
  ...(e._count ? { vacanciesCount: e._count.vacancies } : {}),
});

const serializeJobSeeker = (j) => ({
  id: j.id,
  firstName: j.firstName,
  lastName: j.lastName,
  email: j.email,
  phone: j.phone,
  city: j.city,
  desiredPosition: j.desiredPosition,
  experienceYears: j.experienceYears,
  resume: j.resume,
  createdAt: j.createdAt,
  ...(j._count ? { applicationsCount: j._count.applications } : {}),
});

const serializeApplication = (a) => ({
  id: a.id,
  status: a.status,
  coverLetter: a.coverLetter,
  createdAt: a.createdAt,
  vacancyId: a.vacancyId,
  jobSeekerId: a.jobSeekerId,
  ...(a.vacancy ? { vacancy: { id: a.vacancy.id, title: a.vacancy.title, status: a.vacancy.status } } : {}),
  ...(a.jobSeeker ? { jobSeeker: { id: a.jobSeeker.id, firstName: a.jobSeeker.firstName, lastName: a.jobSeeker.lastName } } : {}),
});

const serializeUser = (u) => ({
  id: u.id,
  email: u.email,
  role: u.role,
  employerId: u.employerId,
  jobSeekerId: u.jobSeekerId,
  ...(u.displayName ? { displayName: u.displayName } : {}),
});

module.exports = {
  ApiError, asyncHandler, parsePagination, sendPage, toIntOrNull, toStrOrNull, apiErrorHandler,
  serializeCategory, serializeVacancy, serializeEmployer, serializeJobSeeker, serializeApplication, serializeUser,
};
