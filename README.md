# Вакансії — Лабораторна №6 (RESTful API)

Окремий проєкт на основі ЛБ-5 (Express + Prisma + Handlebars + Passport.js).
Додано **RESTful API** (`/api`, формат JSON) для доступу до даних системи та керування ними:
категорії, вакансії, відгуки, роботодавці, шукачі роботи. Веб-інтерфейс і адмін-панель з ЛБ-3…5 працюють як раніше.

## Запуск

```bash
npm install
npx prisma generate
npm run setup      # prisma migrate deploy + початкові дані (seed)
npm start          # http://localhost:3000   API: http://localhost:3000/api
```

Нових міграцій немає — схема БД та сама.

**Тестування API без сторонніх програм:** відкрийте `http://localhost:3000/api-tester.html` — вбудована сторінка-тестер
(аналог Postman): список готових запитів зліва, поля Method / URL / Body, статус і JSON відповіді, кнопка «▶ Запустити всі»
(44 запити по ролях, підсумок `Passed 44 / 44`). Cookie сесії зберігає браузер.
Для тих, хто користується Postman, є колекція `docs/Vacancies-API.postman_collection.json`.

## Тестові облікові записи

| Роль          | Email                 | Пароль      |
|---------------|-----------------------|-------------|
| Адміністратор | admin@example.com     | admin123    |
| Роботодавець  | employer@example.com  | employer123 |
| Роботодавець 2| employer2@example.com | employer123 |
| Шукач роботи  | seeker@example.com    | seeker123   |
| Відвідувач    | (без входу)           | —           |

## Принципи REST у цьому API

- **Ресурси — іменники у множині**: `/api/vacancies`, `/api/vacancies/5`, вкладений `/api/vacancies/5/applications`.
- **HTTP-методи**: `GET` — читання, `POST` — створення, `PUT` — повна заміна, `PATCH` — часткове оновлення, `DELETE` — видалення.
- **Коди статусу**: `200 OK`, `201 Created` (+ заголовок `Location`), `204 No Content`, `400` (валідація),
  `401` (потрібен вхід), `403` (недостатньо прав), `404`, `409` (конфлікт: дублікат або пов'язані дані), `500`.
- **Єдині формати відповіді**:
  - ресурс — сам JSON-об'єкт;
  - список — `{ "data": [...], "meta": { "page", "limit", "total", "totalPages" } }`;
  - помилка — `{ "error": { "status", "message", "details": [{ "field", "message" }] } }`.
- **Фільтри, пошук, сортування, сторінки** у query-параметрах: `?categoryId=1&city=Львів&q=Node&sort=salaryMin&order=asc&page=2&limit=5`.
- **Без стану між запитами на стороні клієнта**: автентифікація — сесійна cookie Passport (`POST /api/auth/login`),
  ролі та перевірки власника ресурсу ті самі, що й у веб-версії. Паролі (`passwordHash`) у відповідях ніколи не повертаються.

## Ендпоінти

| Метод | URL | Доступ | Опис |
|-------|-----|--------|------|
| GET | `/api` | всі | опис API |
| POST | `/api/auth/login` | всі | вхід `{email, password}` → cookie сесії |
| POST | `/api/auth/logout` | авторизовані | вихід (204) |
| GET | `/api/auth/me` | авторизовані | поточний користувач і роль |
| POST | `/api/auth/register/employer` | гості | реєстрація роботодавця (201) |
| POST | `/api/auth/register/jobseeker` | гості | реєстрація шукача (201) |
| GET | `/api/categories` | всі | список категорій (`q`, `page`, `limit`) |
| GET | `/api/categories/:id` | всі | категорія |
| POST / PUT / PATCH / DELETE | `/api/categories[/:id]` | ADMIN | створення, заміна, часткове оновлення, видалення (409, якщо є вакансії) |
| GET | `/api/vacancies` | всі | список; відвідувач бачить лише `OPEN`, роботодавець — ще й свої чернетки, адмін — усі |
| GET | `/api/vacancies/:id` | всі | вакансія (чернетки/закриті — лише власнику й адміну, для інших 404) |
| POST | `/api/vacancies` | EMPLOYER, ADMIN | створення (для роботодавця `employerId` береться із сесії) |
| PUT / PATCH / DELETE | `/api/vacancies/:id` | власник-роботодавець, ADMIN | заміна, часткове оновлення, видалення |
| GET | `/api/vacancies/:id/applications` | власник-роботодавець, ADMIN | відгуки на вакансію |
| GET | `/api/applications` | авторизовані | свої відгуки: шукач — власні, роботодавець — на свої вакансії, адмін — усі (`vacancyId`, `status`) |
| GET | `/api/applications/:id` | автор, власник вакансії, ADMIN | відгук |
| POST | `/api/applications` | JOB_SEEKER | подати відгук `{vacancyId, coverLetter}` (409 — дубль) |
| PUT / PATCH | `/api/applications/:id` | власник вакансії, ADMIN | змінити статус `{status}` |
| DELETE | `/api/applications/:id` | автор, ADMIN | видалити відгук |
| GET / POST | `/api/employers` | ADMIN | список / створення роботодавця з обліковим записом |
| GET / PUT / PATCH | `/api/employers/:id` | сам роботодавець, ADMIN | профіль |
| DELETE | `/api/employers/:id` | ADMIN | видалення (каскадно: вакансії, відгуки, акаунт) |
| GET | `/api/jobseekers` | ADMIN, EMPLOYER | список шукачів |
| POST | `/api/jobseekers` | ADMIN | створення шукача з обліковим записом |
| GET / PUT / PATCH | `/api/jobseekers/:id` | сам шукач, ADMIN | профіль |
| DELETE | `/api/jobseekers/:id` | ADMIN | видалення |

## Приклади

```bash
# вхід (cookie зберігається у файлі)
curl -c cj.txt -H "Content-Type: application/json" -d '{"email":"employer@example.com","password":"employer123"}' http://localhost:3000/api/auth/login

# створити вакансію
curl -b cj.txt -H "Content-Type: application/json" -d '{"title":"DevOps","description":"Опис вакансії тут","employmentType":"REMOTE","categoryId":1}' http://localhost:3000/api/vacancies

# публічний список із фільтрами
curl "http://localhost:3000/api/vacancies?categoryId=1&sort=title&order=asc&limit=5"
```

## Структура (нове в ЛБ-6)

```
routes/api/                       ← index (опис API, JSON 404) + маршрути кожного ресурсу
controllers/api/                  ← контролери ресурсів, apiHelpers (ApiError, пагінація, серіалізатори, обробник помилок)
middleware/apiAuth.js             ← apiAuth / apiRole (401/403 у JSON), mergeBody (для PATCH), idParam
validators/apiValidator.js        ← validate → 400 з details, правила для акаунтів і зв'язків
docs/Vacancies-API.postman_collection.json
public/api-tester.html            ← вбудований тестер API (працює в браузері)
```

Валідація повторно використовує правила з веб-версії (`vacancyValidationRules` тощо). Для `PATCH` поточні значення запису
підмішуються під відсутні поля, після чого застосовуються ті самі правила, що й для `PUT`.
