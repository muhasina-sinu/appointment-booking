import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto, AdminBookDto } from './dto';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto, userId: string) {
    // Entire check + book inside a serializable transaction to prevent race conditions
    const appointment = await this.prisma.$transaction(async (tx) => {
      // Lock the slot row by reading inside the transaction
      const slot = await tx.slot.findUnique({
        where: { id: dto.slotId },
      });

      if (!slot) {
        throw new NotFoundException('Slot not found');
      }

      if (slot.isBooked) {
        throw new BadRequestException('This slot is already booked');
      }

      // Prevent booking past slots
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const slotDate = new Date(slot.date);
      slotDate.setHours(0, 0, 0, 0);

      if (slotDate < today) {
        throw new BadRequestException('Cannot book a slot in the past');
      }

      if (slotDate.getTime() === today.getTime()) {
        // Same day — check if slot time has already passed
        const now = new Date();
        const [hours, minutes] = slot.startTime.split(':').map(Number);
        if (hours < now.getHours() || (hours === now.getHours() && minutes <= now.getMinutes())) {
          throw new BadRequestException('This time slot has already passed');
        }
      }

      // Mark the slot as booked
      await tx.slot.update({
        where: { id: dto.slotId },
        data: { isBooked: true },
      });

      // Remove any old cancelled appointment for this slot (allows rebooking)
      await tx.appointment.deleteMany({
        where: { slotId: dto.slotId, status: 'CANCELLED' },
      });

      // Create the appointment
      return tx.appointment.create({
        data: {
          userId,
          slotId: dto.slotId,
        },
        include: {
          slot: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });
    });

    return appointment;
  }

  async adminBook(dto: AdminBookDto) {
    const appointment = await this.prisma.$transaction(async (tx) => {
      const slot = await tx.slot.findUnique({
        where: { id: dto.slotId },
      });

      if (!slot) {
        throw new NotFoundException('Slot not found');
      }

      if (slot.isBooked) {
        throw new BadRequestException('This slot is already booked');
      }

      // Prevent booking past slots
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const slotDate = new Date(slot.date);
      slotDate.setHours(0, 0, 0, 0);

      if (slotDate < today) {
        throw new BadRequestException('Cannot book a slot in the past');
      }

      await tx.slot.update({
        where: { id: dto.slotId },
        data: { isBooked: true },
      });

      // Remove any old cancelled appointment for this slot (allows rebooking)
      await tx.appointment.deleteMany({
        where: { slotId: dto.slotId, status: 'CANCELLED' },
      });

      return tx.appointment.create({
        data: {
          slotId: dto.slotId,
          clientName: dto.clientName,
          clientPhone: dto.clientPhone,
          clientEmail: dto.clientEmail,
        },
        include: {
          slot: true,
        },
      });
    });

    return appointment;
  }

  async findAll(date?: string) {
    const where: any = {};

    if (date) {
      where.slot = { date: new Date(date) };
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        slot: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.appointment.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
      },
      include: {
        slot: true,
      },
      orderBy: { slot: { date: 'asc' } },
    });
  }

  async cancel(id: string, userId: string, userRole: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { slot: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Only the owner or admin can cancel
    if (appointment.userId !== userId && userRole !== 'ADMIN') {
      throw new BadRequestException(
        'You are not authorized to cancel this appointment',
      );
    }

    if (appointment.status === 'CANCELLED') {
      throw new BadRequestException('Appointment is already cancelled');
    }

    // Cancel appointment and free the slot in a transaction
    return this.prisma.$transaction(async (tx) => {
      // Free the slot
      await tx.slot.update({
        where: { id: appointment.slotId },
        data: { isBooked: false },
      });

      // Cancel the appointment
      return tx.appointment.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: {
          slot: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });
    });
  }
}
