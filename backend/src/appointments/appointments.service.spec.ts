import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Unit tests for AppointmentsService
 *
 * Tests edge cases:
 * 1. Two users trying to book the same slot simultaneously (race condition)
 * 2. Booking a past time slot
 * 3. Booking an already booked slot
 * 5. Canceling an appointment and rebooking the same slot
 * 7. Invalid / non-existent slot IDs
 */

// Helper to build a future date string (YYYY-MM-DD)
function futureDate(daysAhead = 3): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prisma: PrismaService;

  // Mock factory for PrismaService
  const mockPrisma = {
    $transaction: jest.fn(),
    appointment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    slot: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  // ── Helper: make $transaction execute the callback with a mock tx ────────
  function setupTransaction() {
    // The tx passed to the callback mirrors slot/appointment operations
    const mockTx = {
      slot: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      appointment: {
        create: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
      return cb(mockTx);
    });

    return mockTx;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Edge case 3: Booking an already booked slot
  // ═══════════════════════════════════════════════════════════════════════════
  describe('create() – booking an already booked slot', () => {
    it('should throw BadRequestException when the slot is already booked', async () => {
      const tx = setupTransaction();
      const fDate = futureDate();

      tx.slot.findUnique.mockResolvedValue({
        id: 'slot-1',
        date: new Date(fDate),
        startTime: '10:00',
        endTime: '10:30',
        isBooked: true, // already booked
      });

      await expect(
        service.create({ slotId: 'slot-1' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create({ slotId: 'slot-1' }, 'user-1'),
      ).rejects.toThrow('This slot is already booked');

      // Slot should NOT be updated
      expect(tx.slot.update).not.toHaveBeenCalled();
      expect(tx.appointment.create).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Edge case 7: Non-existent slot ID
  // ═══════════════════════════════════════════════════════════════════════════
  describe('create() – non-existent slot', () => {
    it('should throw NotFoundException when slot does not exist', async () => {
      const tx = setupTransaction();

      tx.slot.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          { slotId: '00000000-0000-0000-0000-000000000000' },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.create(
          { slotId: '00000000-0000-0000-0000-000000000000' },
          'user-1',
        ),
      ).rejects.toThrow('Slot not found');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Edge case 2: Booking a slot whose date is in the past
  // ═══════════════════════════════════════════════════════════════════════════
  describe('create() – booking a past date slot', () => {
    it('should throw BadRequestException for a past-date slot', async () => {
      const tx = setupTransaction();

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      tx.slot.findUnique.mockResolvedValue({
        id: 'slot-past',
        date: pastDate,
        startTime: '10:00',
        endTime: '10:30',
        isBooked: false,
      });

      await expect(
        service.create({ slotId: 'slot-past' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create({ slotId: 'slot-past' }, 'user-1'),
      ).rejects.toThrow('Cannot book a slot in the past');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Edge case 2b: Booking a same-day slot whose time has already passed
  // ═══════════════════════════════════════════════════════════════════════════
  describe('create() – booking a today slot that has passed', () => {
    it('should throw BadRequestException when time slot has already passed', async () => {
      const tx = setupTransaction();

      // Use a time that's definitely in the past (midnight)
      const now = new Date();
      const today = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
      );

      tx.slot.findUnique.mockResolvedValue({
        id: 'slot-expired',
        date: today,
        startTime: '00:00',
        endTime: '00:30',
        isBooked: false,
      });

      await expect(
        service.create({ slotId: 'slot-expired' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create({ slotId: 'slot-expired' }, 'user-1'),
      ).rejects.toThrow('This time slot has already passed');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Happy path: Successful booking
  // ═══════════════════════════════════════════════════════════════════════════
  describe('create() – successful booking', () => {
    it('should book a future slot successfully', async () => {
      const tx = setupTransaction();
      const fDate = futureDate();

      const mockSlot = {
        id: 'slot-1',
        date: new Date(fDate),
        startTime: '14:00',
        endTime: '14:30',
        isBooked: false,
      };

      const mockAppointment = {
        id: 'appt-1',
        userId: 'user-1',
        slotId: 'slot-1',
        status: 'CONFIRMED',
        slot: { ...mockSlot, isBooked: true },
        user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
      };

      tx.slot.findUnique.mockResolvedValue(mockSlot);
      tx.slot.update.mockResolvedValue({ ...mockSlot, isBooked: true });
      tx.appointment.create.mockResolvedValue(mockAppointment);

      const result = await service.create({ slotId: 'slot-1' }, 'user-1');

      expect(result).toEqual(mockAppointment);
      expect(tx.slot.update).toHaveBeenCalledWith({
        where: { id: 'slot-1' },
        data: { isBooked: true },
      });
      expect(tx.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { userId: 'user-1', slotId: 'slot-1' },
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Edge case 1: Two users trying to book the same slot simultaneously
  //  (race condition – the second call should fail)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('create() – concurrent booking (race condition)', () => {
    it('should allow the first booking and reject the second', async () => {
      const fDate = futureDate();
      let bookCount = 0;

      // Simulate the slot being free on the first call and booked on the second
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        bookCount++;
        const tx = {
          slot: {
            findUnique: jest.fn(),
            update: jest.fn(),
          },
          appointment: {
            create: jest.fn(),
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        };

        if (bookCount === 1) {
          // First user sees slot as available
          tx.slot.findUnique.mockResolvedValue({
            id: 'slot-race',
            date: new Date(fDate),
            startTime: '10:00',
            endTime: '10:30',
            isBooked: false,
          });
          tx.appointment.create.mockResolvedValue({
            id: 'appt-1',
            slotId: 'slot-race',
            userId: 'user-1',
            status: 'CONFIRMED',
          });
          return cb(tx);
        } else {
          // Second user sees slot as already booked (row locked by first transaction)
          tx.slot.findUnique.mockResolvedValue({
            id: 'slot-race',
            date: new Date(fDate),
            startTime: '10:00',
            endTime: '10:30',
            isBooked: true,
          });
          return cb(tx);
        }
      });

      // First booking succeeds
      const result1 = await service.create(
        { slotId: 'slot-race' },
        'user-1',
      );
      expect(result1).toBeDefined();
      expect(result1.status).toBe('CONFIRMED');

      // Second booking fails
      await expect(
        service.create({ slotId: 'slot-race' }, 'user-2'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create({ slotId: 'slot-race' }, 'user-2'),
      ).rejects.toThrow('This slot is already booked');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Edge case 5: Cancel an appointment and rebook the same slot
  // ═══════════════════════════════════════════════════════════════════════════
  describe('cancel() + rebook flow', () => {
    it('should cancel the appointment, free the slot, then allow rebooking', async () => {
      const fDate = futureDate();

      // ── Step 1: Set up existing confirmed appointment ─────────────────
      const existingAppointment = {
        id: 'appt-1',
        userId: 'user-1',
        slotId: 'slot-1',
        status: 'CONFIRMED',
        slot: {
          id: 'slot-1',
          date: new Date(fDate),
          startTime: '10:00',
          endTime: '10:30',
          isBooked: true,
        },
      };

      mockPrisma.appointment.findUnique.mockResolvedValue(existingAppointment);

      // The cancel method uses $transaction to free the slot + cancel appointment
      const cancelledAppointment = {
        ...existingAppointment,
        status: 'CANCELLED',
        slot: { ...existingAppointment.slot, isBooked: false },
      };

      mockPrisma.$transaction.mockImplementationOnce(async (cb: Function) => {
        const tx = {
          slot: { update: jest.fn().mockResolvedValue(null) },
          appointment: {
            update: jest.fn().mockResolvedValue(cancelledAppointment),
          },
        };
        return cb(tx);
      });

      // Cancel
      const cancelResult = await service.cancel('appt-1', 'user-1', 'USER');
      expect(cancelResult.status).toBe('CANCELLED');

      // ── Step 2: Rebook the now-free slot ──────────────────────────────
      const tx2 = {
        slot: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'slot-1',
            date: new Date(fDate),
            startTime: '10:00',
            endTime: '10:30',
            isBooked: false, // slot is free after cancel
          }),
          update: jest.fn(),
        },
        appointment: {
          create: jest.fn().mockResolvedValue({
            id: 'appt-2',
            userId: 'user-2',
            slotId: 'slot-1',
            status: 'CONFIRMED',
          }),
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };

      mockPrisma.$transaction.mockImplementationOnce(async (cb: Function) =>
        cb(tx2),
      );

      const rebookResult = await service.create(
        { slotId: 'slot-1' },
        'user-2',
      );
      expect(rebookResult.status).toBe('CONFIRMED');
      expect(rebookResult.slotId).toBe('slot-1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  cancel() – already cancelled appointment
  // ═══════════════════════════════════════════════════════════════════════════
  describe('cancel() – already cancelled', () => {
    it('should throw BadRequestException if appointment is already cancelled', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue({
        id: 'appt-1',
        userId: 'user-1',
        slotId: 'slot-1',
        status: 'CANCELLED',
        slot: { id: 'slot-1' },
      });

      await expect(
        service.cancel('appt-1', 'user-1', 'USER'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.cancel('appt-1', 'user-1', 'USER'),
      ).rejects.toThrow('Appointment is already cancelled');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  cancel() – unauthorized user trying to cancel someone else's appointment
  // ═══════════════════════════════════════════════════════════════════════════
  describe('cancel() – unauthorized cancellation', () => {
    it('should throw BadRequestException when non-owner non-admin tries to cancel', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue({
        id: 'appt-1',
        userId: 'user-1', // belongs to user-1
        slotId: 'slot-1',
        status: 'CONFIRMED',
        slot: { id: 'slot-1' },
      });

      await expect(
        service.cancel('appt-1', 'user-2', 'USER'), // user-2 tries to cancel
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.cancel('appt-1', 'user-2', 'USER'),
      ).rejects.toThrow('You are not authorized to cancel this appointment');
    });

    it('should allow ADMIN to cancel any appointment', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue({
        id: 'appt-1',
        userId: 'user-1',
        slotId: 'slot-1',
        status: 'CONFIRMED',
        slot: { id: 'slot-1' },
      });

      const cancelledResult = {
        id: 'appt-1',
        userId: 'user-1',
        slotId: 'slot-1',
        status: 'CANCELLED',
        slot: { id: 'slot-1', isBooked: false },
      };

      mockPrisma.$transaction.mockImplementationOnce(async (cb: Function) => {
        const tx = {
          slot: { update: jest.fn() },
          appointment: {
            update: jest.fn().mockResolvedValue(cancelledResult),
          },
        };
        return cb(tx);
      });

      const result = await service.cancel('appt-1', 'admin-1', 'ADMIN');
      expect(result.status).toBe('CANCELLED');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  adminBook() – non-existent slot
  // ═══════════════════════════════════════════════════════════════════════════
  describe('adminBook() – non-existent slot', () => {
    it('should throw NotFoundException when slot does not exist', async () => {
      const tx = setupTransaction();
      tx.slot.findUnique.mockResolvedValue(null);

      await expect(
        service.adminBook({
          slotId: '00000000-0000-0000-0000-000000000000',
          clientName: 'Walk-in Client',
          clientPhone: '1234567890',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  adminBook() – already booked slot
  // ═══════════════════════════════════════════════════════════════════════════
  describe('adminBook() – already booked slot', () => {
    it('should throw BadRequestException when slot is already booked', async () => {
      const tx = setupTransaction();
      tx.slot.findUnique.mockResolvedValue({
        id: 'slot-1',
        date: new Date(futureDate()),
        startTime: '10:00',
        endTime: '10:30',
        isBooked: true,
      });

      await expect(
        service.adminBook({
          slotId: 'slot-1',
          clientName: 'Walk-in Client',
          clientPhone: '1234567890',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.adminBook({
          slotId: 'slot-1',
          clientName: 'Walk-in Client',
          clientPhone: '1234567890',
        }),
      ).rejects.toThrow('This slot is already booked');
    });
  });
});
