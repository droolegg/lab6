const prisma = require('../../prisma/client');
const { ApiError, parsePagination, sendPage, serializeCategory, toStrOrNull } = require('./apiHelpers');

const INCLUDE = { _count: { select: { vacancies: true } } };

// GET /api/categories?q=&page=&limit=
exports.list = async (req, res) => {
  const pg = parsePagination(req.query);
  const q = String(req.query.q || '').trim();
  const where = q ? { OR: [{ name: { contains: q } }, { description: { contains: q } }] } : {};
  const [total, rows] = await Promise.all([
    prisma.category.count({ where }),
    prisma.category.findMany({ where, include: INCLUDE, orderBy: { id: 'asc' }, skip: pg.skip, take: pg.limit }),
  ]);
  sendPage(res, rows.map(serializeCategory), total, pg);
};

// GET /api/categories/:id
exports.get = async (req, res) => {
  const category = await prisma.category.findUnique({ where: { id: Number(req.params.id) }, include: INCLUDE });
  if (!category) throw new ApiError(404, 'Категорію не знайдено.');
  res.json(serializeCategory(category));
};

// Поточні значення — для PATCH
exports.currentValues = async (req) => {
  const c = await prisma.category.findUnique({ where: { id: Number(req.params.id) } });
  if (!c) throw new ApiError(404, 'Категорію не знайдено.');
  return { name: c.name, description: c.description };
};

// POST /api/categories (ADMIN) → 201
exports.create = async (req, res) => {
  const category = await prisma.category.create({
    data: { name: req.body.name, description: toStrOrNull(req.body.description) },
  });
  res.status(201).location(`/api/categories/${category.id}`).json(serializeCategory(category));
};

// PUT|PATCH /api/categories/:id (ADMIN)
exports.update = async (req, res) => {
  const id = Number(req.params.id);
  if (!(await prisma.category.findUnique({ where: { id } }))) throw new ApiError(404, 'Категорію не знайдено.');
  const category = await prisma.category.update({
    where: { id },
    data: { name: req.body.name, description: toStrOrNull(req.body.description) },
  });
  res.json(serializeCategory(category));
};

// DELETE /api/categories/:id (ADMIN) → 204; якщо є вакансії — 409 (onDelete: Restrict)
exports.remove = async (req, res) => {
  const id = Number(req.params.id);
  if (!(await prisma.category.findUnique({ where: { id } }))) throw new ApiError(404, 'Категорію не знайдено.');
  const used = await prisma.vacancy.count({ where: { categoryId: id } });
  if (used > 0) throw new ApiError(409, `Категорію не можна видалити: у ній ${used} вакансій.`);
  await prisma.category.delete({ where: { id } });
  res.status(204).end();
};
