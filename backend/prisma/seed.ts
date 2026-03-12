import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@appointbook.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@appointbook.com',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });
  console.log('Admin user created:', admin.email);

  // Create sample slots for the next 7 days (idempotent — skips existing)
  const timeSlots = [
    { start: '09:00', end: '09:30' },
    { start: '09:30', end: '10:00' },
    { start: '10:00', end: '10:30' },
    { start: '10:30', end: '11:00' },
    { start: '11:00', end: '11:30' },
    { start: '11:30', end: '12:00' },
    { start: '14:00', end: '14:30' },
    { start: '14:30', end: '15:00' },
    { start: '15:00', end: '15:30' },
    { start: '15:30', end: '16:00' },
  ];

  let created = 0;
  let skipped = 0;

  for (let i = 1; i <= 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);

    for (const slot of timeSlots) {
      const existing = await prisma.slot.findFirst({
        where: {
          date,
          startTime: slot.start,
          endTime: slot.end,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.slot.create({
        data: {
          date,
          startTime: slot.start,
          endTime: slot.end,
          isBooked: false,
        },
      });
      created++;
    }
  }

  console.log(
    `Sample slots: created ${created}, skipped ${skipped} existing`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
