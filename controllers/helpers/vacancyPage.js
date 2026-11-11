const prisma = require('../../prisma/client');
const { canManageVacancy } = require('../../middleware/auth');

// Умова видимості вакансій залежно від ролі:
// адмін бачить усі; роботодавець — відкриті + власні; решта — лише відкриті.
function visibilityWhere(user) {
  if (user && user.role === 'ADMIN') return {};
  if (user && user.role === 'EMPLOYER') {
    return { OR: [{ status: 'OPEN' }, { employerId: user.employerId }] };
  }
  return { status: 'OPEN' };
}

// Дані для сторінки вакансії з урахуванням прав поточного користувача
async function getVacancyPage(user, id) {
  const vacancy = await prisma.vacancy.findUnique({
    where: { id },
    include: { employer: true, category: true, _count: { select: { applications: true } } },
  });
  if (!vacancy) return null;

  const canManage = canManageVacancy(user, vacancy);
  if (vacancy.status !== 'OPEN' && !canManage) return null; // чернетки/закриті не показуємо чужим

  let applications = [];
  let myApplication = null;

  if (canManage) {
    applications = await prisma.application.findMany({
      where: { vacancyId: id },
      include: { jobSeeker: true },
      orderBy: { createdAt: 'desc' },
    });
  } else if (user && user.role === 'JOB_SEEKER') {
    myApplication = await prisma.application.findUnique({
      where: { vacancyId_jobSeekerId: { vacancyId: id, jobSeekerId: user.jobSeekerId } },
    });
  }

  return {
    vacancy,
    applications,
    myApplication,
    canManage,
    canApply: !!user && user.role === 'JOB_SEEKER' && vacancy.status === 'OPEN' && !myApplication,
  };
}

module.exports = { visibilityWhere, getVacancyPage };
