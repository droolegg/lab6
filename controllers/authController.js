const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const passport = require('../config/passport');
const prisma = require('../prisma/client');

// GET /login
exports.loginForm = (req, res) => res.render('auth/login', { title: 'Вхід' });

// POST /login
exports.login = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('auth/login', {
      title: 'Вхід',
      errors: errors.array(),
      values: { email: req.body.email },
    });
  }

  // passport.authenticate з callback — щоб самим показати помилку на формі
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).render('auth/login', {
        title: 'Вхід',
        errors: [{ msg: info.message }],
        values: { email: req.body.email },
      });
    }
    // passport при вході створює нову сесію, тому returnTo зберігаємо наперед
    const returnTo = req.session.returnTo || '/';
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.redirect(returnTo);
    });
  })(req, res, next);
};

// POST /logout
exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => res.redirect('/'));
  });
};

// GET /register
exports.registerChoice = (req, res) => res.render('auth/register', { title: 'Реєстрація' });

// GET /register/employer
exports.employerForm = (req, res) => res.render('auth/registerEmployer', { title: 'Реєстрація роботодавця' });

// POST /register/employer
exports.employerRegister = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('auth/registerEmployer', {
      title: 'Реєстрація роботодавця',
      errors: errors.array(),
      values: req.body,
    });
  }

  try {
    const { companyName, email, password, phone, website, city, description } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    // Профіль роботодавця і обліковий запис створюються разом (одна транзакція)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'EMPLOYER', // роль задає сервер, а не форма
        employer: {
          create: {
            companyName,
            email,
            passwordHash,
            phone: phone || null,
            website: website || null,
            city: city || null,
            description: description || null,
          },
        },
      },
    });
    req.logIn(user, (err) => (err ? next(err) : res.redirect('/profile')));
  } catch (err) {
    next(err);
  }
};

// GET /register/jobseeker
exports.jobSeekerForm = (req, res) => res.render('auth/registerJobSeeker', { title: 'Реєстрація шукача роботи' });

// POST /register/jobseeker
exports.jobSeekerRegister = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('auth/registerJobSeeker', {
      title: 'Реєстрація шукача роботи',
      errors: errors.array(),
      values: req.body,
    });
  }

  try {
    const { firstName, lastName, email, password, phone, city, desiredPosition, experienceYears, resume } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'JOB_SEEKER',
        jobSeeker: {
          create: {
            firstName,
            lastName,
            email,
            passwordHash,
            phone: phone || null,
            city: city || null,
            desiredPosition: desiredPosition || null,
            experienceYears: experienceYears ? Number(experienceYears) : 0,
            resume: resume || null,
          },
        },
      },
    });
    req.logIn(user, (err) => (err ? next(err) : res.redirect('/profile')));
  } catch (err) {
    next(err);
  }
};

// GET /profile — особистий кабінет (вміст залежить від ролі)
exports.profile = async (req, res) => {
  const u = req.user;
  const data = { title: 'Мій профіль' };

  if (u.role === 'EMPLOYER') {
    data.employer = await prisma.employer.findUnique({ where: { id: u.employerId } });
    data.vacancies = await prisma.vacancy.findMany({
      where: { employerId: u.employerId },
      include: { category: true, _count: { select: { applications: true } } },
      orderBy: { createdAt: 'desc' },
    });
  } else if (u.role === 'JOB_SEEKER') {
    data.jobSeeker = await prisma.jobSeeker.findUnique({ where: { id: u.jobSeekerId } });
    data.applications = await prisma.application.findMany({
      where: { jobSeekerId: u.jobSeekerId },
      include: { vacancy: { include: { employer: true } } },
      orderBy: { createdAt: 'desc' },
    });
  } else {
    const [users, vacancies, applications] = await Promise.all([
      prisma.user.count(),
      prisma.vacancy.count(),
      prisma.application.count(),
    ]);
    data.stats = { users, vacancies, applications };
  }
  res.render('profile', data);
};
