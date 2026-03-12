import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SlotsService } from './slots.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Unit tests for SlotsService
 *
 * Tests edge cases:
 * 4. Booking overlapping slots (overlap detection)
 * 6. Admin deleting a slot that has bookings
 * Plus: past-date rejection, time validation
 */

// Helper to build a future date string (YYYY-MM-DD)
function futureDate(daysAhead = 3): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

describe('SlotsService', () => {
  let service: SlotsService;

  const mockPrisma = {
    slot: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SlotsService>(SlotsService);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Edge case: End time must be after start time
  // ═══════════════════════════════════════════════════════════════════════════
  describe('create() – time validation', () => {
    it('should throw BadRequestException when endTime <= startTime', async () => {
      await expect(
        service.create({
          date: futureDate(),
          startTime: '14:00',
          endTime: '13:00',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create({
          date: futureDate(),
          startTime: '14:00',
          endTime: '13:00',
        }),
      ).rejects.toThrow('End time must be after start time');
    });

    it('should throw BadRequestException when endTime equals startTime', async () => {
      await expect(
        service.create({
          date: futureDate(),
          startTime: '14:00',
          endTime: '14:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Edge case: Creating a slot in the past
  // ═══════════════════════════════════════════════════════════════════════════
  describe('create() – past date rejection', () => {
    it('should throw BadRequestException for a past date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 3);
      const dateStr = pastDate.toISOString().split('T')[0];

      await expect(
        service.create({
          date: dateStr,
          startTime: '10:00',
          endTime: '10:30',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create({
          date: dateStr,
          startTime: '10:00',
          endTime: '10:30',
        }),
      ).rejects.toThrow('Cannot create a slot in the past');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Edge case 4: Overlapping slot detection
  // ═══════════════════════════════════════════════════════════════════════════
  describe('create() – overlapping slot detection', () => {
    it('should reject a slot that fully overlaps an existing one', async () => {
      const date = futureDate();

      // Existing slot: 10:00 - 10:30
      mockPrisma.slot.findFirst.mockResolvedValue({
        id: 'existing-slot',
        date: new Date(date),
        startTime: '10:00',
        endTime: '10:30',
        isBooked: false,
      });

      await expect(
        service.create({
          date,
          startTime: '10:00',
          endTime: '10:30',
        }),
      ).rejects.toThrow(BadRequestException);

      // Verify the overlap query was issued with correct parameters
      expect(mockPrisma.slot.findFirst).toHaveBeenCalledWith({
        where: {
          date: new Date(date),
          startTime: { lt: '10:30' },
          endTime: { gt: '10:00' },
        },
      });
    });

    it('should reject a slot that partially overlaps (starts inside existing)', async () => {
      const date = futureDate();

      // Existing slot: 10:00 - 11:00
      mockPrisma.slot.findFirst.mockResolvedValue({
        id: 'existing-slot',
        date: new Date(date),
        startTime: '10:00',
        endTime: '11:00',
        isBooked: false,
      });

      await expect(
        service.create({
          date,
          startTime: '10:30',
          endTime: '11:30',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create({
          date,
          startTime: '10:30',
          endTime: '11:30',
        }),
      ).rejects.toThrow('A slot already exists in this time range');
    });

    it('should reject a slot that wraps an existing slot', async () => {
      const date = futureDate();

      // Existing slot: 10:00 - 10:30
      mockPrisma.slot.findFirst.mockResolvedValue({
        id: 'existing-slot',
        date: new Date(date),
        startTime: '10:00',
        endTime: '10:30',
        isBooked: false,
      });

      // New slot: 09:00 - 11:00 (wraps existing)
      await expect(
        service.create({
          date,
          startTime: '09:00',
          endTime: '11:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow a slot that does NOT overlap (adjacent)', async () => {
      const date = futureDate();

      // No overlap found
      mockPrisma.slot.findFirst.mockResolvedValue(null);
      mockPrisma.slot.create.mockResolvedValue({
        id: 'new-slot',
        date: new Date(date),
        startTime: '11:00',
        endTime: '11:30',
        isBooked: false,
      });

      const result = await service.create({
        date,
        startTime: '11:00',
        endTime: '11:30',
      });

      expect(result.id).toBe('new-slot');
      expect(mockPrisma.slot.create).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Edge case 6: Admin deleting a slot that has bookings
  // ═══════════════════════════════════════════════════════════════════════════
  describe('remove() – deleting a booked slot', () => {
    it('should throw BadRequestException when trying to delete a booked slot', async () => {
      mockPrisma.slot.findUnique.mockResolvedValue({
        id: 'slot-booked',
        date: new Date(futureDate()),
        startTime: '10:00',
        endTime: '10:30',
        isBooked: true,
        appointment: { id: 'appt-1', status: 'CONFIRMED' },
      });

      await expect(service.remove('slot-booked')).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.remove('slot-booked')).rejects.toThrow(
        'Cannot delete a booked slot. Cancel the appointment first.',
      );

      expect(mockPrisma.slot.delete).not.toHaveBeenCalled();
    });

    it('should allow deleting an unbooked slot', async () => {
      mockPrisma.slot.findUnique.mockResolvedValue({
        id: 'slot-free',
        date: new Date(futureDate()),
        startTime: '10:00',
        endTime: '10:30',
        isBooked: false,
        appointment: null,
      });

      mockPrisma.slot.delete.mockResolvedValue({
        id: 'slot-free',
      });

      const result = await service.remove('slot-free');
      expect(result.id).toBe('slot-free');
      expect(mockPrisma.slot.delete).toHaveBeenCalledWith({
        where: { id: 'slot-free' },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  remove() – slot not found
  // ═══════════════════════════════════════════════════════════════════════════
  describe('remove() – slot not found', () => {
    it('should throw NotFoundException when slot does not exist', async () => {
      mockPrisma.slot.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.remove('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow('Slot not found');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Happy path: Successful slot creation
  // ═══════════════════════════════════════════════════════════════════════════
  describe('create() – successful creation', () => {
    it('should create a slot on a future date with no overlaps', async () => {
      const date = futureDate();

      mockPrisma.slot.findFirst.mockResolvedValue(null); // No overlap
      mockPrisma.slot.create.mockResolvedValue({
        id: 'new-slot-1',
        date: new Date(date),
        startTime: '14:00',
        endTime: '14:30',
        isBooked: false,
      });

      const result = await service.create({
        date,
        startTime: '14:00',
        endTime: '14:30',
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'new-slot-1',
          startTime: '14:00',
          endTime: '14:30',
          isBooked: false,
        }),
      );

      expect(mockPrisma.slot.create).toHaveBeenCalledWith({
        data: {
          date: new Date(date),
          startTime: '14:00',
          endTime: '14:30',
        },
      });
    });
  });
});
