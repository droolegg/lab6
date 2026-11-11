const { validationResult } = require('express-validator');
const prisma = require('../prisma/client');

// GET /categories
exports.list = async (req, res) => {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { vacancies: true } } },
    orderBy: { id: 'asc' },
  });
  res.render('categories/index', { title: 'Категорії', categories });
};

// GET /categories/new
exports.newForm = (req, res) => {
  res.render('categories/new', { title: 'Нова категорія' });
};

// POST /categories
exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('categories/new', {
      title: 'Нова категорія',
      errors: errors.array(),
      values: req.body,
    });
  }

  const { name, description } = req.body;
  await prisma.category.create({
    data: { name, description: description || null },
  });
  res.redirect('/categories');
};

// GET /categories/:id/edit
exports.editForm = async (req, res) => {
  const category = await prisma.category.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (!category) return res.status(404).send('Категорію не знайдено');
  res.render('categories/edit', { title: 'Редагування категорії', category });
};

// PUT /categories/:id
exports.update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const category = { id: req.params.id, ...req.body };
    return res.render('categories/edit', {
      title: 'Редагування категорії',
      errors: errors.array(),
      category,
    });
  }

  const { name, description } = req.body;
  await prisma.category.update({
    where: { id: Number(req.params.id) },
    data: { name, description: description || null },
  });
  res.redirect('/categories');
};

// DELETE /categories/:id
// Категорію з вакансіями видалити не можна (onDelete: Restrict) — показуємо зрозуміле повідомлення
exports.delete = async (req, res) => {
  const id = Number(req.params.id);
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { vacancies: true } } },
  });
  if (category && category._count.vacancies > 0) {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { vacancies: true } } },
      orderBy: { id: 'asc' },
    });
    return res.status(409).render('categories/index', {
      title: 'Категорії',
      categories,
      errors: [{ msg: `Категорію «${category.name}» не можна видалити: у ній є вакансії (${category._count.vacancies}).` }],
    });
  }
  if (category) await prisma.category.delete({ where: { id } });
  res.redirect('/categories');
};
