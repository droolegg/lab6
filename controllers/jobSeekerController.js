const { validationResult } = require('express-validator');
const prisma = require('../prisma/client');

// GET /jobseekers
exports.list = async (req, res) => {
  const jobSeekers = await prisma.jobSeeker.findMany({
    include: { _count: { select: { applications: true } } },
    orderBy: { id: 'asc' },
  });
  res.render('jobSeekers/index', { title: 'Шукачі роботи', jobSeekers });
};

// GET /jobseekers/:id/edit
exports.editForm = async (req, res) => {
  const jobSeeker = await prisma.jobSeeker.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (!jobSeeker) return res.status(404).send('Шукача не знайдено');
  res.render('jobSeekers/edit', { title: 'Редагування шукача', jobSeeker });
};

// PUT /jobseekers/:id
exports.update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const current = await prisma.jobSeeker.findUnique({ where: { id: Number(req.params.id) } });
    const jobSeeker = { ...req.body, id: req.params.id, email: current && current.email };
    return res.render('jobSeekers/edit', {
      title: 'Редагування шукача',
      errors: errors.array(),
      jobSeeker,
    });
  }

  const { firstName, lastName, phone, city, desiredPosition, experienceYears, resume } = req.body;
  await prisma.jobSeeker.update({
    where: { id: Number(req.params.id) },
    data: {
      firstName,
      lastName,
      phone: phone || null,
      city: city || null,
      desiredPosition: desiredPosition || null,
      experienceYears: experienceYears ? Number(experienceYears) : 0,
      resume: resume || null,
    },
  });
  res.redirect(req.user.role === 'ADMIN' ? '/jobseekers' : '/profile');
};

// DELETE /jobseekers/:id
exports.delete = async (req, res) => {
  await prisma.jobSeeker.delete({ where: { id: Number(req.params.id) } });
  res.redirect('/jobseekers');
};
