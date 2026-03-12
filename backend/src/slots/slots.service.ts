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

  async create(dto: CreateSlotDto) {
    // Validate that end time is after start time
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Prevent creating slots in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const slotDate = new Date(dto.date);
    slotDate.setHours(0, 0, 0, 0);

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

  async findAll(date?: string) {
    const where = date ? { date: new Date(date) } : {};

    return this.prisma.slot.findMany({
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
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findAvailable(date?: string) {
    const where: any = { isBooked: false };
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (date) {
      // Don't return slots for past dates
      if (date < todayStr) {
        return [];
      }
      where.date = new Date(date);
    } else {
      // Only show future slots
      where.date = { gte: new Date(todayStr) };
    }

    const slots = await this.prisma.slot.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    // Filter out today's slots whose start time has already passed
    const nowHours = today.getHours();
    const nowMinutes = today.getMinutes();

    return slots.filter((slot) => {
      const slotDate = new Date(slot.date);
      slotDate.setHours(0, 0, 0, 0);
      const todayDate = new Date(today);
      todayDate.setHours(0, 0, 0, 0);

      // Future dates — always include
      if (slotDate.getTime() > todayDate.getTime()) {
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
