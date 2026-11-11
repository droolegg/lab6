const { PrismaClient } = require('@prisma/client');

// Один спільний екземпляр клієнта на весь застосунок
const prisma = new PrismaClient();

module.exports = prisma;
