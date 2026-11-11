// Перевірки "власник ресурсу" — захист від доступу до чужих даних за підміненим id в URL.
const prisma = require('../prisma/client');
const { canManageVacancy, renderForbidden } = require('./auth');

// Вакансією може керувати її роботодавець або адміністратор
async function vacancyManager(req, res, next) {
  const vacancy = await prisma.vacancy.findUnique({ where: { id: Number(req.params.id) } });
  if (!vacancy) return res.status(404).render('404', { title: 'Не знайдено' });
  if (!canManageVacancy(req.user, vacancy)) return renderForbidden(req, res);
  req.vacancy = vacancy;
  next();
}

// Роботодавець бачить/змінює лише власні дані; адміністратор — будь-які
function selfEmployerOrAdmin(req, res, next) {
  if (req.user.role === 'ADMIN') return next();
  if (req.user.role === 'EMPLOYER' && req.user.employerId === Number(req.params.id)) return next();
  return renderForbidden(req, res);
}

function selfJobSeekerOrAdmin(req, res, next) {
  if (req.user.role === 'ADMIN') return next();
  if (req.user.role === 'JOB_SEEKER' && req.user.jobSeekerId === Number(req.params.id)) return next();
  return renderForbidden(req, res);
}

// Статус відгуку змінює роботодавець вакансії або адміністратор
async function applicationVacancyManager(req, res, next) {
  const application = await prisma.application.findUnique({
    where: { id: Number(req.params.id) },
    include: { vacancy: true },
  });
  if (!application) return res.status(404).render('404', { title: 'Не знайдено' });
  if (!canManageVacancy(req.user, application.vacancy)) return renderForbidden(req, res);
  req.application = application;
  next();
}

// Відгук видаляє його автор (шукач) або адміністратор
async function applicationOwnerOrAdmin(req, res, next) {
  const application = await prisma.application.findUnique({ where: { id: Number(req.params.id) } });
  if (!application) return res.status(404).render('404', { title: 'Не знайдено' });
  const isOwner = req.user.role === 'JOB_SEEKER' && application.jobSeekerId === req.user.jobSeekerId;
  if (!isOwner && req.user.role !== 'ADMIN') return renderForbidden(req, res);
  req.application = application;
  next();
}

// Підставляємо id власника із сесії, а не з форми — підмінити його в запиті неможливо
function forceOwnEmployerId(req, res, next) {
  if (req.user.role === 'EMPLOYER') req.body.employerId = String(req.user.employerId);
  next();
}

function forceOwnJobSeekerId(req, res, next) {
  req.body.jobSeekerId = String(req.user.jobSeekerId);
  next();
}

module.exports = {
  vacancyManager,
  selfEmployerOrAdmin,
  selfJobSeekerOrAdmin,
  applicationVacancyManager,
  applicationOwnerOrAdmin,
  forceOwnEmployerId,
  forceOwnJobSeekerId,
};
