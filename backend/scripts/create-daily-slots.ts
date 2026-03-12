/**
 * Daily Slot Generation Script
 *
 * Creates appointment slots for the next N days (default: 7).
 * Idempotent — skips dates/times that already have a slot.
 *
 * Usage:
 *   npx ts-node scripts/create-daily-slots.ts          # next 7 days
 *   npx ts-node scripts/create-daily-slots.ts 14        # next 14 days
 *
 * Environment:
 *   DATABASE_URL must be set (reads from .env automatically via Prisma).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default weekly schedule — adjust times/durations to your needs
const TIME_SLOTS = [
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

// Skip weekends (0 = Sunday, 6 = Saturday). Set to [] to include all days.
const SKIP_DAYS: number[] = [0, 6];

async function createDailySlots(daysAhead: number = 7) {
  let created = 0;
  let skipped = 0;

  for (let i = 1; i <= daysAhead; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);

    // Skip configured days (e.g. weekends)
    if (SKIP_DAYS.includes(date.getDay())) {
      continue;
    }

    for (const slot of TIME_SLOTS) {
      // Check if this exact slot already exists (idempotent)
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
    `✅ Done! Created ${created} new slots, skipped ${skipped} existing slots.`,
  );
}

// Accept optional CLI argument for number of days
const days = parseInt(process.argv[2], 10) || 7;

createDailySlots(days)
  .catch((e) => {
    console.error('❌ Error creating slots:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
