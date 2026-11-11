const { validationResult } = require('express-validator');
const prisma = require('../prisma/client');

// GET /employers
exports.list = async (req, res) => {
  const employers = await prisma.employer.findMany({
    include: { _count: { select: { vacancies: true } } },
    orderBy: { id: 'asc' },
  });
  res.render('employers/index', { title: 'Роботодавці', employers });
};

// GET /employers/:id/edit
exports.editForm = async (req, res) => {
  const employer = await prisma.employer.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (!employer) return res.status(404).send('Роботодавця не знайдено');
  res.render('employers/edit', { title: 'Редагування роботодавця', employer });
};

// PUT /employers/:id
exports.update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // email не редагується (він же логін), тому беремо його з БД для відображення
    const current = await prisma.employer.findUnique({ where: { id: Number(req.params.id) } });
    const employer = { ...req.body, id: req.params.id, email: current && current.email };
    return res.render('employers/edit', {
      title: 'Редагування роботодавця',
      errors: errors.array(),
      employer,
    });
  }

  const { companyName, phone, website, city, description } = req.body;
  await prisma.employer.update({
    where: { id: Number(req.params.id) },
    data: {
      companyName,
      phone: phone || null,
      website: website || null,
      city: city || null,
      description: description || null,
    },
  });
  // Адмін повертається до списку, роботодавець — у свій профіль
  res.redirect(req.user.role === 'ADMIN' ? '/employers' : '/profile');
};

// DELETE /employers/:id
exports.delete = async (req, res) => {
  await prisma.employer.delete({ where: { id: Number(req.params.id) } });
  res.redirect('/employers');
};
