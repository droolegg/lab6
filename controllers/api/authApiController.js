const bcrypt = require('bcryptjs');
const passport = require('../../config/passport');
const prisma = require('../../prisma/client');
const { ApiError, serializeUser, serializeEmployer, serializeJobSeeker, toStrOrNull, toIntOrNull } = require('./apiHelpers');

// POST /api/auth/login  { email, password } → 200 { user }, cookie сесії
exports.login = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return next(new ApiError(401, (info && info.message) || 'Невірний email або пароль.'));
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.json({ user: serializeUser(user) });
    });
  })(req, res, next);
};

// POST /api/auth/logout → 204
exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => res.status(204).end());
  });
};

// GET /api/auth/me → поточний користувач і його роль
exports.me = (req, res) => res.json({ user: serializeUser(req.user) });

// Дані профілю з тіла запиту (однакові для реєстрації та створення адміном)
const employerData = (b) => ({
  companyName: b.companyName,
  phone: toStrOrNull(b.phone),
  website: toStrOrNull(b.website),
  city: toStrOrNull(b.city),
  description: toStrOrNull(b.description),
});
const jobSeekerData = (b) => ({
  firstName: b.firstName,
  lastName: b.lastName,
  phone: toStrOrNull(b.phone),
  city: toStrOrNull(b.city),
  desiredPosition: toStrOrNull(b.desiredPosition),
  experienceYears: toIntOrNull(b.experienceYears) || 0,
  resume: toStrOrNull(b.resume),
});

// Профіль і обліковий запис створюються разом (роль задає сервер, а не клієнт)
exports.createEmployerAccount = async (body) => {
  const passwordHash = await bcrypt.hash(body.password, 10);
  return prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      role: 'EMPLOYER',
      employer: { create: { ...employerData(body), email: body.email, passwordHash } },
    },
    include: { employer: true },
  });
};

exports.createJobSeekerAccount = async (body) => {
  const passwordHash = await bcrypt.hash(body.password, 10);
  return prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      role: 'JOB_SEEKER',
      jobSeeker: { create: { ...jobSeekerData(body), email: body.email, passwordHash } },
    },
    include: { jobSeeker: true },
  });
};

exports.employerData = employerData;
exports.jobSeekerData = jobSeekerData;

// POST /api/auth/register/employer → 201, користувач одразу авторизований
exports.registerEmployer = async (req, res, next) => {
  if (req.isAuthenticated()) throw new ApiError(409, 'Ви вже авторизовані. Спершу виконайте вихід.');
  const user = await exports.createEmployerAccount(req.body);
  req.logIn(user, (err) => {
    if (err) return next(err);
    res.status(201).location(`/api/employers/${user.employerId}`).json({ user: serializeUser(user), employer: serializeEmployer(user.employer) });
  });
};

// POST /api/auth/register/jobseeker → 201
exports.registerJobSeeker = async (req, res, next) => {
  if (req.isAuthenticated()) throw new ApiError(409, 'Ви вже авторизовані. Спершу виконайте вихід.');
  const user = await exports.createJobSeekerAccount(req.body);
  req.logIn(user, (err) => {
    if (err) return next(err);
    res.status(201).location(`/api/jobseekers/${user.jobSeekerId}`).json({ user: serializeUser(user), jobSeeker: serializeJobSeeker(user.jobSeeker) });
  });
};
