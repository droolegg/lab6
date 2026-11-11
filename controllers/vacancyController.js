const { validationResult } = require('express-validator');
const prisma = require('../prisma/client');
const { visibilityWhere, getVacancyPage } = require('./helpers/vacancyPage');

// GET /vacancies?categoryId=...
exports.list = async (req, res) => {
  const { categoryId } = req.query;
  // Видимість залежить від ролі: відвідувач бачить лише відкриті вакансії
  const where = { ...visibilityWhere(req.user), ...(categoryId ? { categoryId: Number(categoryId) } : {}) };

  const [vacancies, categories] = await Promise.all([
    prisma.vacancy.findMany({
      where,
      include: {
        employer: true,
        category: true,
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ]);

  res.render('vacancies/index', {
    title: 'Вакансії',
    vacancies,
    categories,
    selectedCategoryId: categoryId ? Number(categoryId) : null,
  });
};

// Список роботодавців потрібен лише адміністратору (роботодавець публікує від свого імені)
const loadEmployers = (user) =>
  user.role === 'ADMIN' ? prisma.employer.findMany({ orderBy: { companyName: 'asc' } }) : Promise.resolve([]);

// GET /vacancies/new
exports.newForm = async (req, res) => {
  const [employers, categories] = await Promise.all([
    loadEmployers(req.user),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ]);
  res.render('vacancies/new', { title: 'Нова вакансія', employers, categories });
};

// POST /vacancies
exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const [employers, categories] = await Promise.all([
      loadEmployers(req.user),
      prisma.category.findMany({ orderBy: { name: 'asc' } }),
    ]);
    return res.render('vacancies/new', {
      title: 'Нова вакансія',
      employers,
      categories,
      errors: errors.array(),
      values: req.body,
    });
  }

  const { title, description, salaryMin, salaryMax, currency, city, employmentType, employerId, categoryId } = req.body;
  await prisma.vacancy.create({
    data: {
      title,
      description,
      salaryMin: salaryMin ? Number(salaryMin) : null,
      salaryMax: salaryMax ? Number(salaryMax) : null,
      currency: currency || 'UAH',
      city: city || null,
      employmentType,
      employerId: Number(employerId),
      categoryId: Number(categoryId),
    },
  });
  res.redirect('/vacancies');
};

// GET /vacancies/:id
exports.show = async (req, res) => {
  const page = await getVacancyPage(req.user, Number(req.params.id));
  if (!page) return res.status(404).render('404', { title: 'Не знайдено' });
  res.render('vacancies/show', { title: page.vacancy.title, ...page });
};

// GET /vacancies/:id/edit  (права перевірено в vacancyManager, вакансія в req.vacancy)
exports.editForm = async (req, res) => {
  const [employers, categories] = await Promise.all([
    loadEmployers(req.user),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ]);
  res.render('vacancies/edit', { title: 'Редагування вакансії', vacancy: req.vacancy, employers, categories });
};

// PUT /vacancies/:id
exports.update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const [employers, categories] = await Promise.all([
      loadEmployers(req.user),
      prisma.category.findMany({ orderBy: { name: 'asc' } }),
    ]);
    const vacancy = { id: req.params.id, ...req.body };
    return res.render('vacancies/edit', {
      title: 'Редагування вакансії',
      errors: errors.array(),
      vacancy,
      employers,
      categories,
    });
  }

  const { title, description, salaryMin, salaryMax, currency, city, employmentType, status, employerId, categoryId } = req.body;
  await prisma.vacancy.update({
    where: { id: Number(req.params.id) },
    data: {
      title,
      description,
      salaryMin: salaryMin ? Number(salaryMin) : null,
      salaryMax: salaryMax ? Number(salaryMax) : null,
      currency: currency || 'UAH',
      city: city || null,
      employmentType,
      status,
      employerId: Number(employerId),
      categoryId: Number(categoryId),
    },
  });
  res.redirect(`/vacancies/${req.params.id}`);
};

// DELETE /vacancies/:id
exports.delete = async (req, res) => {
  await prisma.vacancy.delete({ where: { id: Number(req.params.id) } });
  res.redirect('/vacancies');
};
