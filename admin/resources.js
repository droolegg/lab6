// Опис усіх таблиць, якими керує адміністратор в адмін-панелі (Лаб. №5).
// Один опис = список, форма створення/редагування, валідація й видалення.
// Щоб додати нову таблицю в адмінку, достатньо додати сюди ще один запис.
const bcrypt = require('bcryptjs');
const prisma = require('../prisma/client');

const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME', label: 'Повна зайнятість' },
  { value: 'PART_TIME', label: 'Часткова зайнятість' },
  { value: 'REMOTE', label: 'Віддалено' },
  { value: 'INTERNSHIP', label: 'Стажування' },
  { value: 'CONTRACT', label: 'Контракт' },
];
const VACANCY_STATUSES = [
  { value: 'DRAFT', label: 'Чернетка' },
  { value: 'OPEN', label: 'Відкрита' },
  { value: 'CLOSED', label: 'Закрита' },
];
const APPLICATION_STATUSES = [
  { value: 'NEW', label: 'Новий' },
  { value: 'VIEWED', label: 'Переглянуто' },
  { value: 'INVITED', label: 'Запрошено' },
  { value: 'REJECTED', label: 'Відхилено' },
];
const ROLES = [
  { value: 'ADMIN', label: 'Адміністратор' },
  { value: 'EMPLOYER', label: 'Роботодавець' },
  { value: 'JOB_SEEKER', label: 'Шукач роботи' },
];

const labelOf = (list, value) => (list.find((o) => o.value === value) || {}).label || value;
const dash = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));
const cut = (v, n = 50) => (v && v.length > n ? v.slice(0, n) + '…' : dash(v));
const hash = (p) => bcrypt.hash(p, 10);

// Повторювані поля профілів роботодавця / шукача
const PHONE = /^[0-9+\-() ]{6,20}$/;

const resources = {
  // ---------------------------------------------------------------- Категорії
  categories: {
    key: 'categories',
    model: 'category',
    title: 'Категорії',
    singular: 'категорію',
    searchFields: ['name', 'description'],
    orderBy: { id: 'asc' },
    include: { _count: { select: { vacancies: true } } },
    deleteWarning: 'Категорію можна видалити, лише якщо в ній немає вакансій.',
    fields: [
      { name: 'name', label: 'Назва', type: 'text', required: true, min: 2, max: 100, unique: true },
      { name: 'description', label: 'Опис', type: 'textarea', max: 500 },
    ],
    columns: ['ID', 'Назва', 'Опис', 'Вакансій'],
    row: (r) => [{ text: r.id }, { text: r.name }, { text: cut(r.description), muted: true }, { text: r._count.vacancies }],
  },

  // ------------------------------------------------------------ Роботодавці
  employers: {
    key: 'employers',
    model: 'employer',
    title: 'Роботодавці',
    singular: 'роботодавця',
    searchFields: ['companyName', 'email', 'city'],
    orderBy: { id: 'asc' },
    include: { _count: { select: { vacancies: true } } },
    deleteWarning: 'Разом з роботодавцем буде видалено його обліковий запис, усі його вакансії та відгуки на них.',
    fields: [
      { name: 'companyName', label: 'Назва компанії', type: 'text', required: true, min: 2, max: 150 },
      { name: 'email', label: 'Email (логін)', type: 'email', required: true, unique: true, uniqueIn: ['employer', 'user'], immutable: true },
      { name: 'password', label: 'Пароль', type: 'password', min: 6, passwordField: true },
      { name: 'phone', label: 'Телефон', type: 'text', pattern: PHONE, patternMsg: 'Телефон має містити лише цифри, пробіли та символи + - ( ).' },
      { name: 'city', label: 'Місто', type: 'text', max: 100 },
      { name: 'website', label: 'Сайт', type: 'url' },
      { name: 'description', label: 'Опис компанії', type: 'textarea', max: 1000 },
    ],
    columns: ['ID', 'Компанія', 'Email', 'Місто', 'Вакансій'],
    row: (r) => [{ text: r.id }, { text: r.companyName }, { text: r.email }, { text: dash(r.city), muted: true }, { text: r._count.vacancies }],
    // Профіль і обліковий запис (User) створюються разом, як і при реєстрації
    async create({ data, password }) {
      const passwordHash = await hash(password);
      return prisma.user.create({
        data: { email: data.email, passwordHash, role: 'EMPLOYER', employer: { create: { ...data, passwordHash } } },
      });
    },
    async update({ id, data, password }) {
      if (password) {
        const passwordHash = await hash(password);
        data.passwordHash = passwordHash;
        await prisma.user.updateMany({ where: { employerId: id }, data: { passwordHash } });
      }
      return prisma.employer.update({ where: { id }, data });
    },
  },

  // ---------------------------------------------------------- Шукачі роботи
  jobseekers: {
    key: 'jobseekers',
    model: 'jobSeeker',
    title: 'Шукачі роботи',
    singular: 'шукача роботи',
    searchFields: ['firstName', 'lastName', 'email', 'desiredPosition'],
    orderBy: { id: 'asc' },
    include: { _count: { select: { applications: true } } },
    deleteWarning: 'Разом із шукачем буде видалено його обліковий запис і всі його відгуки.',
    fields: [
      { name: 'firstName', label: "Ім'я", type: 'text', required: true, min: 2, max: 80, half: true },
      { name: 'lastName', label: 'Прізвище', type: 'text', required: true, min: 2, max: 80, half: true },
      { name: 'email', label: 'Email (логін)', type: 'email', required: true, unique: true, uniqueIn: ['jobSeeker', 'user'], immutable: true },
      { name: 'password', label: 'Пароль', type: 'password', min: 6, passwordField: true },
      { name: 'phone', label: 'Телефон', type: 'text', pattern: PHONE, patternMsg: 'Телефон має містити лише цифри, пробіли та символи + - ( ).', half: true },
      { name: 'city', label: 'Місто', type: 'text', max: 100, half: true },
      { name: 'desiredPosition', label: 'Бажана посада', type: 'text', max: 150, half: true },
      { name: 'experienceYears', label: 'Досвід (років)', type: 'int', intMin: 0, intMax: 60, half: true, defaultValue: 0 },
      { name: 'resume', label: 'Резюме', type: 'textarea', max: 3000 },
    ],
    columns: ['ID', "Ім'я", 'Email', 'Бажана посада', 'Досвід', 'Відгуків'],
    row: (r) => [
      { text: r.id }, { text: `${r.firstName} ${r.lastName}` }, { text: r.email },
      { text: dash(r.desiredPosition), muted: true }, { text: `${r.experienceYears} р.` }, { text: r._count.applications },
    ],
    async create({ data, password }) {
      const passwordHash = await hash(password);
      return prisma.user.create({
        data: { email: data.email, passwordHash, role: 'JOB_SEEKER', jobSeeker: { create: { ...data, passwordHash } } },
      });
    },
    async update({ id, data, password }) {
      if (password) {
        const passwordHash = await hash(password);
        data.passwordHash = passwordHash;
        await prisma.user.updateMany({ where: { jobSeekerId: id }, data: { passwordHash } });
      }
      return prisma.jobSeeker.update({ where: { id }, data });
    },
  },

  // ---------------------------------------------------------------- Вакансії
  vacancies: {
    key: 'vacancies',
    model: 'vacancy',
    title: 'Вакансії',
    singular: 'вакансію',
    searchFields: ['title', 'description', 'city'],
    orderBy: { id: 'desc' },
    include: { employer: true, category: true, _count: { select: { applications: true } } },
    deleteWarning: 'Разом із вакансією буде видалено всі відгуки на неї.',
    fields: [
      { name: 'title', label: 'Назва вакансії', type: 'text', required: true, min: 3, max: 200 },
      { name: 'description', label: 'Опис', type: 'textarea', required: true, min: 10 },
      { name: 'employerId', label: 'Роботодавець', type: 'relation', required: true, model: 'employer', optionLabel: (e) => e.companyName, orderBy: { companyName: 'asc' }, half: true },
      { name: 'categoryId', label: 'Категорія', type: 'relation', required: true, model: 'category', optionLabel: (c) => c.name, orderBy: { name: 'asc' }, half: true },
      { name: 'salaryMin', label: 'Зарплата від', type: 'int', intMin: 0, half: true },
      { name: 'salaryMax', label: 'Зарплата до', type: 'int', intMin: 0, half: true },
      { name: 'currency', label: 'Валюта', type: 'text', min: 3, max: 3, minMsg: 'Код валюти має складатись з 3 літер, напр. UAH.', defaultValue: 'UAH', half: true },
      { name: 'city', label: 'Місто', type: 'text', max: 100, half: true },
      { name: 'employmentType', label: 'Тип зайнятості', type: 'select', required: true, options: EMPLOYMENT_TYPES, defaultValue: 'FULL_TIME', half: true },
      { name: 'status', label: 'Статус', type: 'select', required: true, options: VACANCY_STATUSES, defaultValue: 'OPEN', half: true },
    ],
    columns: ['ID', 'Назва', 'Роботодавець', 'Категорія', 'Статус', 'Відгуків'],
    row: (r) => [
      { text: r.id }, { text: r.title }, { text: r.employer.companyName }, { text: r.category.name },
      { text: r.status, badge: r.status }, { text: r._count.applications },
    ],
    crossCheck(body) {
      const errors = [];
      if (body.salaryMin && body.salaryMax && Number(body.salaryMax) < Number(body.salaryMin)) {
        errors.push('Максимальна зарплата не може бути меншою за мінімальну.');
      }
      return errors;
    },
  },

  // ------------------------------------------------------------------ Відгуки
  applications: {
    key: 'applications',
    model: 'application',
    title: 'Відгуки',
    singular: 'відгук',
    searchFields: ['coverLetter'],
    orderBy: { id: 'desc' },
    include: { vacancy: true, jobSeeker: true },
    fields: [
      { name: 'vacancyId', label: 'Вакансія', type: 'relation', required: true, model: 'vacancy', optionLabel: (v) => v.title, orderBy: { title: 'asc' } },
      { name: 'jobSeekerId', label: 'Шукач роботи', type: 'relation', required: true, model: 'jobSeeker', optionLabel: (j) => `${j.firstName} ${j.lastName} (${j.email})`, orderBy: { lastName: 'asc' } },
      { name: 'status', label: 'Статус', type: 'select', required: true, options: APPLICATION_STATUSES, defaultValue: 'NEW' },
      { name: 'coverLetter', label: 'Супровідний лист', type: 'textarea', max: 1500 },
    ],
    columns: ['ID', 'Вакансія', 'Шукач', 'Статус', 'Дата'],
    row: (r) => [
      { text: r.id }, { text: r.vacancy.title }, { text: `${r.jobSeeker.firstName} ${r.jobSeeker.lastName}` },
      { text: r.status, badge: r.status }, { text: new Date(r.createdAt).toLocaleDateString('uk-UA'), muted: true },
    ],
  },

  // ------------------------------------------------------ Облікові записи
  users: {
    key: 'users',
    model: 'user',
    title: 'Користувачі',
    singular: 'користувача',
    searchFields: ['email'],
    orderBy: { id: 'asc' },
    include: { employer: true, jobSeeker: true },
    deleteWarning: 'Обліковий запис буде видалено, і користувач більше не зможе увійти.',
    fields: [
      { name: 'email', label: 'Email (логін)', type: 'email', required: true, unique: true, uniqueIn: ['user'] },
      { name: 'password', label: 'Пароль', type: 'password', min: 6, passwordField: true },
      { name: 'role', label: 'Роль', type: 'select', required: true, options: ROLES, defaultValue: 'JOB_SEEKER' },
      { name: 'employerId', label: 'Профіль роботодавця (для ролі «Роботодавець»)', type: 'relation', model: 'employer', optionLabel: (e) => e.companyName, orderBy: { companyName: 'asc' }, optional: true, half: true },
      { name: 'jobSeekerId', label: 'Профіль шукача (для ролі «Шукач роботи»)', type: 'relation', model: 'jobSeeker', optionLabel: (j) => `${j.firstName} ${j.lastName}`, orderBy: { lastName: 'asc' }, optional: true, half: true },
    ],
    columns: ['ID', 'Email', 'Роль', 'Профіль', 'Створено'],
    row: (r) => [
      { text: r.id }, { text: r.email }, { text: labelOf(ROLES, r.role), role: r.role },
      { text: r.employer ? r.employer.companyName : r.jobSeeker ? `${r.jobSeeker.firstName} ${r.jobSeeker.lastName}` : '—', muted: true },
      { text: new Date(r.createdAt).toLocaleDateString('uk-UA'), muted: true },
    ],
    // Роль має відповідати прив'язаному профілю; адмін не може зашкодити собі
    crossCheck(body, { req, id }) {
      const errors = [];
      const { role, employerId, jobSeekerId } = body;
      if (role === 'EMPLOYER' && !employerId) errors.push('Для ролі «Роботодавець» оберіть профіль роботодавця.');
      if (role === 'JOB_SEEKER' && !jobSeekerId) errors.push('Для ролі «Шукач роботи» оберіть профіль шукача.');
      if (role === 'EMPLOYER' && jobSeekerId) errors.push('Роботодавець не може мати профіль шукача.');
      if (role === 'JOB_SEEKER' && employerId) errors.push('Шукач не може мати профіль роботодавця.');
      if (role === 'ADMIN' && (employerId || jobSeekerId)) errors.push('Адміністратор не має профілю — залиште поля профілю порожніми.');
      if (id && Number(id) === req.user.id && role !== 'ADMIN') errors.push('Не можна зняти роль адміністратора із власного облікового запису.');
      return errors;
    },
    guardDelete(req, id) {
      return Number(id) === req.user.id ? 'Не можна видалити власний обліковий запис.' : null;
    },
    async create({ data, password }) {
      return prisma.user.create({ data: { ...data, passwordHash: await hash(password) } });
    },
    async update({ id, data, password }) {
      if (password) data.passwordHash = await hash(password);
      return prisma.user.update({ where: { id }, data });
    },
  },
};

module.exports = { resources, labelOf };
