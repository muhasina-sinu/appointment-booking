import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSlotDto } from './dto';

@Injectable()
export class SlotsService {
  constructor(private prisma: PrismaService) {}

  /** Get today's date as a UTC midnight Date, timezone-safe for Postgres @db.Date comparisons */
  private getTodayUTC(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );
  }

  async create(dto: CreateSlotDto) {
    // Validate that end time is after start time
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Prevent creating slots in the past
    const today = this.getTodayUTC();
    const slotDate = new Date(dto.date + 'T00:00:00.000Z');

    if (slotDate < today) {
      throw new BadRequestException('Cannot create a slot in the past');
    }

    // Check for overlapping slots on the same date
    // Two slots overlap if one starts before the other ends AND ends after the other starts
    const existingSlot = await this.prisma.slot.findFirst({
      where: {
        date: new Date(dto.date),
        startTime: { lt: dto.endTime },
        endTime: { gt: dto.startTime },
      },
    });

    if (existingSlot) {
      throw new BadRequestException(
        `A slot already exists in this time range (${existingSlot.startTime} - ${existingSlot.endTime})`,
      );
    }

    return this.prisma.slot.create({
      data: {
        date: new Date(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });
  }

  async findAll(date?: string, period?: string, page = 1, limit = 10) {
    const where: any = {};
    const today = this.getTodayUTC();

    if (date) {
      where.date = new Date(date + 'T00:00:00.000Z');
    } else if (period === 'upcoming') {
      where.date = { gte: today };
    } else if (period === 'past') {
      where.date = { lt: today };
    }

    const [data, total, availableCount] = await Promise.all([
      this.prisma.slot.findMany({
        where,
        include: {
          appointment: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy:
          period === 'past'
            ? [{ date: 'desc' }, { startTime: 'desc' }]
            : [{ date: 'asc' }, { startTime: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.slot.count({ where }),
      this.prisma.slot.count({ where: { ...where, isBooked: false } }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      availableCount,
    };
  }

  async findAvailable(date?: string) {
    const where: any = { isBooked: false };
    const today = this.getTodayUTC();
    const todayStr = today.toISOString().split('T')[0];

    if (date) {
      // Don't return slots for past dates
      if (date < todayStr) {
        return [];
      }
      where.date = new Date(date + 'T00:00:00.000Z');
    } else {
      // Only show future slots
      where.date = { gte: today };
    }

    const slots = await this.prisma.slot.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    // Filter out today's slots whose start time has already passed
    const now = new Date();
    const nowHours = now.getHours();
    const nowMinutes = now.getMinutes();

    return slots.filter((slot) => {
      const slotDateStr = new Date(slot.date).toISOString().split('T')[0];

      // Future dates — always include
      if (slotDateStr > todayStr) {
        return true;
      }

      // Today — only include if start time hasn't passed
      const [h, m] = slot.startTime.split(':').map(Number);
      return h > nowHours || (h === nowHours && m > nowMinutes);
    });
  }

  async findOne(id: string) {
    const slot = await this.prisma.slot.findUnique({
      where: { id },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    return slot;
  }

  async remove(id: string) {
    const slot = await this.prisma.slot.findUnique({
      where: { id },
      include: { appointment: true },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    if (slot.isBooked) {
      throw new BadRequestException(
        'Cannot delete a booked slot. Cancel the appointment first.',
      );
    }

    return this.prisma.slot.delete({ where: { id } });
  }
}
