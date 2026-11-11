const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const prisma = require('../prisma/client');

// Стратегія "local": вхід за email + пароль
passport.use(
  new LocalStrategy({ usernameField: 'email', passwordField: 'password' }, async (email, password, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      // Однакове повідомлення і для неіснуючого email, і для хибного пароля —
      // щоб не підказувати зловмисникові, які email зареєстровані.
      if (!user) return done(null, false, { message: 'Невірний email або пароль.' });

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return done(null, false, { message: 'Невірний email або пароль.' });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// У сесію записуємо лише id користувача
passport.serializeUser((user, done) => done(null, user.id));

// На кожному запиті відновлюємо користувача з БД (req.user)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { employer: true, jobSeeker: true },
    });
    if (!user) return done(null, false);

    let displayName = 'Адміністратор';
    if (user.role === 'EMPLOYER' && user.employer) displayName = user.employer.companyName;
    if (user.role === 'JOB_SEEKER' && user.jobSeeker) {
      displayName = `${user.jobSeeker.firstName} ${user.jobSeeker.lastName}`;
    }

    done(null, {
      id: user.id,
      email: user.email,
      role: user.role,
      employerId: user.employerId,
      jobSeekerId: user.jobSeekerId,
      displayName,
    });
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
