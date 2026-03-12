import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Automatically creates appointment slots for the upcoming days.
 *
 * Runs every day at midnight (server time).
 * Idempotent — skips dates/times that already have a slot.
 *
 * Configure TIME_SLOTS, DAYS_AHEAD, and SKIP_DAYS below.
 */
@Injectable()
export class SlotsSchedulerService {
  private readonly logger = new Logger(SlotsSchedulerService.name);

  // ─── Configuration ───────────────────────────────────────
  /** Time blocks to create each day */
  private readonly TIME_SLOTS = [
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

  /** How many days ahead to create slots for */
  private readonly DAYS_AHEAD = 7;

  /** Days to skip (0 = Sunday, 6 = Saturday). Set to [] for 7-day availability */
  private readonly SKIP_DAYS: number[] = [0, 6];
  // ─────────────────────────────────────────────────────────

  constructor(private prisma: PrismaService) {}

  /**
   * Cron: runs every day at midnight.
   * Change the expression to adjust timing:
   *   CronExpression.EVERY_DAY_AT_MIDNIGHT  →  '0 0 * * *'
   *   CronExpression.EVERY_DAY_AT_1AM       →  '0 1 * * *'
   *   '0 0 * * 1-5'                         →  weekdays only at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailySlotCreation() {
    this.logger.log('⏰ Running daily slot creation...');

    let created = 0;
    let skipped = 0;

    for (let i = 1; i <= this.DAYS_AHEAD; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);

      if (this.SKIP_DAYS.includes(date.getDay())) {
        continue;
      }

      for (const slot of this.TIME_SLOTS) {
        const existing = await this.prisma.slot.findFirst({
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

        await this.prisma.slot.create({
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

    this.logger.log(
      `✅ Daily slots: created ${created}, skipped ${skipped} existing`,
    );
  }
}
