const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const hbs = require('hbs');
const session = require('express-session');
const passport = require('./config/passport');
const { ROLE_LABELS, canManageVacancy } = require('./middleware/auth');

const app = express();
app.set('trust proxy', 1); // за проксі хостингу (HTTPS-термінація)

// ---- Налаштування шаблонізатора (View) ----
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
hbs.registerPartials(path.join(__dirname, 'views/partials'));

// Допоміжний helper для порівняння значень у select (обраний option)
hbs.registerHelper('eq', (a, b) => String(a) === String(b));
// Чи може користувач керувати вакансією (власник-роботодавець або адмін) — для показу кнопок
hbs.registerHelper('canManage', (user, vacancy) => canManageVacancy(user, vacancy));
// Форматування дати у зручний вигляд
hbs.registerHelper('formatDate', (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('uk-UA');
});

// ---- Middleware ----
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method')); // дозволяє PUT/DELETE із HTML-форм через ?_method=
app.use(express.static(path.join(__dirname, 'public')));

// ---- Сесії та Passport ----
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 2 }, // 2 години
  })
);
app.use(passport.initialize());
app.use(passport.session()); // відновлює req.user із сесії

// Дані про поточного користувача та його роль доступні в усіх шаблонах
app.use((req, res, next) => {
  const user = req.user || null;
  const role = user ? user.role : 'VISITOR';
  res.locals.currentUser = user;
  res.locals.roleLabel = ROLE_LABELS[role];
  res.locals.isAuth = !!user;
  res.locals.isAdmin = role === 'ADMIN';
  res.locals.isEmployer = role === 'EMPLOYER';
  res.locals.isJobSeeker = role === 'JOB_SEEKER';
  next();
});

// ---- Маршрути (Controller layer підключається через routes/*) ----
const categoryRoutes = require('./routes/categories');
const employerRoutes = require('./routes/employers');
const jobSeekerRoutes = require('./routes/jobSeekers');
const vacancyRoutes = require('./routes/vacancies');
const applicationRoutes = require('./routes/applications');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const { apiErrorHandler } = require('./controllers/api/apiHelpers');

app.get('/', (req, res) => res.render('index', { title: 'Головна' }));

app.use('/', authRoutes);
app.use('/categories', categoryRoutes);
app.use('/employers', employerRoutes);
app.use('/jobseekers', jobSeekerRoutes);
app.use('/vacancies', vacancyRoutes);
app.use('/applications', applicationRoutes);
app.use('/admin', adminRoutes); // захищена область (лише ADMIN)
app.use('/api', apiRoutes); // RESTful API (JSON)

// ---- 404 ----
app.use((req, res) => {
  res.status(404).render('404', { title: 'Не знайдено' });
});

// ---- Обробник помилок ----
app.use((err, req, res, next) => {
  // Помилки API (включно з некоректним JSON у тілі запиту) віддаємо у форматі JSON
  if (req.originalUrl.startsWith('/api')) return apiErrorHandler(err, req, res, next);
  console.error(err);
  res.status(500).send('Внутрішня помилка сервера');
});

const PORT = process.env.PORT || 3000; // на хостингу (Railway) порт задає платформа
app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));
