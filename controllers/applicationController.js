const { validationResult } = require('express-validator');
const prisma = require('../prisma/client');
const { getVacancyPage } = require('./helpers/vacancyPage');

// POST /applications  (шукач роботи подає відгук; jobSeekerId береться із сесії)
exports.create = async (req, res) => {
  const vacancyId = Number(req.body.vacancyId);
  const errors = validationResult(req);

  // Повторний рендер сторінки вакансії з помилками
  const renderErrors = async (list) => {
    const page = await getVacancyPage(req.user, vacancyId);
    if (!page) return res.status(404).render('404', { title: 'Не знайдено' });
    return res.status(400).render('vacancies/show', {
      title: page.vacancy.title,
      ...page,
      errors: list,
      values: req.body,
    });
  };

  if (!errors.isEmpty()) return renderErrors(errors.array());

  const vacancy = await prisma.vacancy.findUnique({ where: { id: vacancyId } });
  if (!vacancy || vacancy.status !== 'OPEN') {
    return renderErrors([{ msg: 'Відгукнутися можна лише на відкриту вакансію.' }]);
  }

  try {
    await prisma.application.create({
      data: {
        vacancyId,
        jobSeekerId: req.user.jobSeekerId,
        coverLetter: req.body.coverLetter || null,
      },
    });
  } catch (err) {
    // Порушення унікальності (vacancyId, jobSeekerId)
    return renderErrors([{ msg: 'Ви вже подали відгук на цю вакансію.' }]);
  }
  res.redirect(`/vacancies/${vacancyId}`);
};

// PUT /applications/:id  (роботодавець вакансії або адмін змінює статус)
exports.updateStatus = async (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    await prisma.application.update({
      where: { id: req.application.id },
      data: { status: req.body.status },
    });
  }
  res.redirect(`/vacancies/${req.application.vacancyId}`);
};

// DELETE /applications/:id  (автор відгуку або адмін)
exports.delete = async (req, res) => {
  await prisma.application.delete({ where: { id: req.application.id } });
  res.redirect(req.user.role === 'ADMIN' ? `/vacancies/${req.application.vacancyId}` : '/profile');
};
