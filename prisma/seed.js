// Початкові дані: користувачі з різними ролями, категорії, вакансії, відгуки.
// Запуск: npm run seed  (повторний запуск безпечний — наявні записи не дублюються)
const bcrypt = require('bcryptjs');
const prisma = require('./client');

async function main() {
  const hash = (p) => bcrypt.hash(p, 10);

  // ---- Адміністратор ----
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', passwordHash: await hash('admin123'), role: 'ADMIN' },
  });

  // ---- Категорії ----
  const catNames = [
    ['IT та розробка', 'Програмування, тестування, DevOps'],
    ['Маркетинг', 'Реклама, SMM, аналітика'],
    ['Продажі', 'Менеджери з продажу, підтримка клієнтів'],
  ];
  const cats = [];
  for (const [name, description] of catNames) {
    cats.push(await prisma.category.upsert({ where: { name }, update: {}, create: { name, description } }));
  }

  // ---- Роботодавці ----
  async function ensureEmployer(email, password, companyName, city) {
    let user = await prisma.user.findUnique({ where: { email } });
    if (user) return user.employerId;
    const passwordHash = await hash(password);
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'EMPLOYER',
        employer: { create: { companyName, email, passwordHash, city } },
      },
    });
    return user.employerId;
  }
  const emp1 = await ensureEmployer('employer@example.com', 'employer123', 'TechSoft', 'Львів');
  const emp2 = await ensureEmployer('employer2@example.com', 'employer123', 'MarketPro', 'Київ');

  // ---- Шукач роботи ----
  let seeker = await prisma.user.findUnique({ where: { email: 'seeker@example.com' } });
  if (!seeker) {
    const passwordHash = await hash('seeker123');
    seeker = await prisma.user.create({
      data: {
        email: 'seeker@example.com',
        passwordHash,
        role: 'JOB_SEEKER',
        jobSeeker: {
          create: {
            firstName: 'Олег',
            lastName: 'Горнякевич',
            email: 'seeker@example.com',
            passwordHash,
            city: 'Дрогобич',
            desiredPosition: 'Node.js розробник',
            experienceYears: 1,
          },
        },
      },
    });
  }

  // ---- Вакансії (лише якщо їх ще немає) ----
  if ((await prisma.vacancy.count()) === 0) {
    const v1 = await prisma.vacancy.create({
      data: {
        title: 'Junior Node.js розробник',
        description: 'Розробка REST API на Express та Prisma.',
        salaryMin: 25000, salaryMax: 40000, city: 'Львів',
        employmentType: 'FULL_TIME', status: 'OPEN',
        employerId: emp1, categoryId: cats[0].id,
      },
    });
    await prisma.vacancy.create({
      data: {
        title: 'QA інженер (чернетка)',
        description: 'Ручне та автоматизоване тестування. Вакансія ще не опублікована.',
        salaryMin: 20000, salaryMax: 35000, city: 'Львів',
        employmentType: 'REMOTE', status: 'DRAFT',
        employerId: emp1, categoryId: cats[0].id,
      },
    });
    await prisma.vacancy.create({
      data: {
        title: 'SMM-менеджер',
        description: 'Ведення соцмереж компанії, підготовка контент-плану.',
        salaryMin: 18000, salaryMax: 28000, city: 'Київ',
        employmentType: 'PART_TIME', status: 'OPEN',
        employerId: emp2, categoryId: cats[1].id,
      },
    });
    await prisma.application.create({
      data: { vacancyId: v1.id, jobSeekerId: seeker.jobSeekerId, coverLetter: 'Маю досвід роботи з Node.js.' },
    });
  }

  console.log('Seed виконано.');
  console.log('  admin@example.com      / admin123     (ADMIN)');
  console.log('  employer@example.com   / employer123  (EMPLOYER, TechSoft)');
  console.log('  employer2@example.com  / employer123  (EMPLOYER, MarketPro)');
  console.log('  seeker@example.com     / seeker123    (JOB_SEEKER)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
