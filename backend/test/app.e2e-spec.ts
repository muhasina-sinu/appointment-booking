import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * End-to-end (integration) tests for the Appointment Booking API.
 *
 * All 8 requested edge cases:
 * 1. Two users trying to book the same slot simultaneously
 * 2. Booking a past time slot
 * 3. Booking an already booked slot
 * 4. Booking overlapping slots
 * 5. Canceling an appointment and rebooking
 * 6. Admin deleting a slot that has bookings
 * 7. Invalid slot IDs
 * 8. Unauthorized booking attempts
 *
 * Uses the real database (ensure DATABASE_URL points to a test DB).
 */

describe('Appointment Booking API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Auth tokens & user IDs populated during setup
  let adminToken: string;
  let userToken: string;
  let user2Token: string;
  let adminId: string;
  let userId: string;
  let user2Id: string;

  // Helper to build a future date string (YYYY-MM-DD), daysAhead from today
  function futureDate(daysAhead = 5): string {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
  }

  function pastDate(daysAgo = 3): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Match the same validation config as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');

    await app.init();

    prisma = app.get(PrismaService);

    // ── Clean only e2e test data (preserves seeded/production data) ─────
    const testUsers = await prisma.user.findMany({
      where: { email: { endsWith: '-e2e@test.com' } },
      select: { id: true },
    });
    const testUserIds = testUsers.map((u) => u.id);

    if (testUserIds.length > 0) {
      await prisma.appointment.deleteMany({
        where: { userId: { in: testUserIds } },
      });
    }
    // Delete slots created by test (future dates far ahead, e.g. 5-15 days)
    // This is handled per-test in afterAll blocks, so we just clean users
    await prisma.user.deleteMany({
      where: { email: { endsWith: '-e2e@test.com' } },
    });

    // ── Register test users ─────────────────────────────────────────────
    // Admin user (we create as USER first, then promote via Prisma)
    const adminReg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Test Admin',
        email: 'admin-e2e@test.com',
        password: 'admin123',
      })
      .expect(201);

    adminToken = adminReg.body.accessToken;
    adminId = adminReg.body.user.id;

    // Promote to ADMIN
    await prisma.user.update({
      where: { id: adminId },
      data: { role: 'ADMIN' },
    });

    // Re-login to get a token that reflects the ADMIN role
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin-e2e@test.com', password: 'admin123' })
      .expect(200);
    adminToken = adminLogin.body.accessToken;

    // Regular user 1
    const user1Reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Test User 1',
        email: 'user1-e2e@test.com',
        password: 'user123',
      })
      .expect(201);

    userToken = user1Reg.body.accessToken;
    userId = user1Reg.body.user.id;

    // Regular user 2
    const user2Reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Test User 2',
        email: 'user2-e2e@test.com',
        password: 'user123',
      })
      .expect(201);

    user2Token = user2Reg.body.accessToken;
    user2Id = user2Reg.body.user.id;
  }, 30000);

  afterAll(async () => {
    // Clean up only e2e test data (preserves seeded/production data)
    const testUsers = await prisma.user.findMany({
      where: { email: { endsWith: '-e2e@test.com' } },
      select: { id: true },
    });
    const testUserIds = testUsers.map((u) => u.id);

    if (testUserIds.length > 0) {
      await prisma.appointment.deleteMany({
        where: { userId: { in: testUserIds } },
      });
    }
    await prisma.user.deleteMany({
      where: { email: { endsWith: '-e2e@test.com' } },
    });
    await app.close();
  });

  // Helper to create a slot via the admin API
  async function createSlot(date: string, startTime: string, endTime: string) {
    const res = await request(app.getHttpServer())
      .post('/api/slots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ date, startTime, endTime })
      .expect(201);
    return res.body;
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  Edge case 8: Unauthorized booking attempts
  // ═════════════════════════════════════════════════════════════════════════
  describe('8. Unauthorized booking attempts', () => {
    it('POST /api/appointments – should return 401 without a token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/appointments')
        .send({ slotId: '00000000-0000-0000-0000-000000000000' })
        .expect(401);

      expect(res.body.message).toBe('Unauthorized');
    });

    it('POST /api/appointments – should return 401 with an invalid token', async () => {
      await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', 'Bearer invalid.token.here')
        .send({ slotId: '00000000-0000-0000-0000-000000000000' })
        .expect(401);
    });

    it('POST /api/appointments/admin-book – should return 403 for non-admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/appointments/admin-book')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          slotId: '00000000-0000-0000-0000-000000000000',
          clientName: 'Walk-in',
          clientPhone: '1234567890',
        })
        .expect(403);

      expect(res.body.message).toBe('Forbidden resource');
    });

    it('POST /api/slots – should return 403 for non-admin creating slots', async () => {
      await request(app.getHttpServer())
        .post('/api/slots')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          date: futureDate(),
          startTime: '10:00',
          endTime: '10:30',
        })
        .expect(403);
    });

    it('DELETE /api/slots/:id – should return 403 for non-admin deleting slots', async () => {
      await request(app.getHttpServer())
        .delete('/api/slots/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //  Edge case 7: Invalid slot IDs
  // ═════════════════════════════════════════════════════════════════════════
  describe('7. Invalid slot IDs', () => {
    it('POST /api/appointments – should return 400 for a non-UUID slotId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ slotId: 'not-a-valid-uuid' })
        .expect(400);

      expect(res.body.message).toContain('slotId must be a valid UUID');
    });

    it('POST /api/appointments – should return 404 for a valid UUID that does not exist', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ slotId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
        .expect(404);

      expect(res.body.message).toBe('Slot not found');
    });

    it('POST /api/appointments – should return 400 when slotId is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //  Edge case 2: Booking a past time slot
  // ═════════════════════════════════════════════════════════════════════════
  describe('2. Booking a past time slot', () => {
    let pastSlotId: string;

    beforeAll(async () => {
      // Directly insert a past slot into the DB (can't create via API)
      const pastSlot = await prisma.slot.create({
        data: {
          date: new Date(pastDate(5)),
          startTime: '10:00',
          endTime: '10:30',
          isBooked: false,
        },
      });
      pastSlotId = pastSlot.id;
    });

    afterAll(async () => {
      await prisma.slot.deleteMany({ where: { id: pastSlotId } });
    });

    it('should return 400 when booking a slot in the past', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ slotId: pastSlotId })
        .expect(400);

      expect(res.body.message).toBe('Cannot book a slot in the past');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //  Edge case 4: Booking overlapping slots (slot creation overlap)
  // ═════════════════════════════════════════════════════════════════════════
  describe('4. Creating overlapping slots', () => {
    const slotDate = futureDate(7);
    let baseSlotId: string;

    beforeAll(async () => {
      const slot = await createSlot(slotDate, '10:00', '10:30');
      baseSlotId = slot.id;
    });

    afterAll(async () => {
      await prisma.appointment.deleteMany({ where: { slotId: baseSlotId } });
      await prisma.slot.deleteMany({ where: { id: baseSlotId } });
    });

    it('should reject an exact duplicate slot', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/slots')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: slotDate, startTime: '10:00', endTime: '10:30' })
        .expect(400);

      expect(res.body.message).toContain('A slot already exists');
    });

    it('should reject a slot that starts inside the existing one', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/slots')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: slotDate, startTime: '10:15', endTime: '10:45' })
        .expect(400);

      expect(res.body.message).toContain('A slot already exists');
    });

    it('should reject a slot that wraps the existing one', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/slots')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: slotDate, startTime: '09:45', endTime: '11:00' })
        .expect(400);

      expect(res.body.message).toContain('A slot already exists');
    });

    it('should allow an adjacent (non-overlapping) slot', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/slots')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: slotDate, startTime: '10:30', endTime: '11:00' })
        .expect(201);

      expect(res.body.startTime).toBe('10:30');

      // Clean up
      await prisma.slot.delete({ where: { id: res.body.id } });
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //  Edge case 3: Booking an already booked slot
  // ═════════════════════════════════════════════════════════════════════════
  describe('3. Booking an already booked slot', () => {
    let slotId: string;

    beforeAll(async () => {
      const slot = await createSlot(futureDate(8), '14:00', '14:30');
      slotId = slot.id;

      // User 1 books the slot
      await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ slotId })
        .expect(201);
    });

    afterAll(async () => {
      await prisma.appointment.deleteMany({ where: { slotId } });
      await prisma.slot.deleteMany({ where: { id: slotId } });
    });

    it('should return 400 when a second user books the same slot', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ slotId })
        .expect(400);

      expect(res.body.message).toBe('This slot is already booked');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //  Edge case 1: Two users trying to book the same slot simultaneously
  // ═════════════════════════════════════════════════════════════════════════
  describe('1. Concurrent booking (race condition)', () => {
    let slotId: string;

    beforeAll(async () => {
      const slot = await createSlot(futureDate(9), '15:00', '15:30');
      slotId = slot.id;
    });

    afterAll(async () => {
      await prisma.appointment.deleteMany({ where: { slotId } });
      await prisma.slot.deleteMany({ where: { id: slotId } });
    });

    it('should allow only one booking when two users book simultaneously', async () => {
      // Fire two booking requests concurrently
      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/appointments')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ slotId }),
        request(app.getHttpServer())
          .post('/api/appointments')
          .set('Authorization', `Bearer ${user2Token}`)
          .send({ slotId }),
      ]);

      const statuses = [res1.status, res2.status].sort();

      // One should succeed (201) and one should fail (400)
      expect(statuses).toEqual([201, 400]);

      // The failed one should have the "already booked" message
      const failedRes = res1.status === 400 ? res1 : res2;
      expect(failedRes.body.message).toBe('This slot is already booked');

      // Verify exactly one appointment exists in the database
      const appointments = await prisma.appointment.findMany({
        where: { slotId },
      });
      expect(appointments).toHaveLength(1);
      expect(appointments[0].status).toBe('CONFIRMED');

      // Verify the slot is marked as booked
      const slot = await prisma.slot.findUnique({ where: { id: slotId } });
      expect(slot!.isBooked).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //  Edge case 5: Canceling an appointment and rebooking the same slot
  // ═════════════════════════════════════════════════════════════════════════
  describe('5. Cancel and rebook flow', () => {
    let slotId: string;
    let appointmentId: string;

    beforeAll(async () => {
      const slot = await createSlot(futureDate(10), '11:00', '11:30');
      slotId = slot.id;
    });

    afterAll(async () => {
      await prisma.appointment.deleteMany({ where: { slotId } });
      await prisma.slot.deleteMany({ where: { id: slotId } });
    });

    it('should book, cancel, and rebook successfully', async () => {
      // ── Step 1: User 1 books the slot ─────────────────────────────────
      const bookRes = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ slotId })
        .expect(201);

      appointmentId = bookRes.body.id;
      expect(bookRes.body.status).toBe('CONFIRMED');

      // Verify slot is booked
      let slot = await prisma.slot.findUnique({ where: { id: slotId } });
      expect(slot!.isBooked).toBe(true);

      // ── Step 2: User 1 cancels the appointment ────────────────────────
      const cancelRes = await request(app.getHttpServer())
        .delete(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(cancelRes.body.status).toBe('CANCELLED');

      // Verify slot is now free
      slot = await prisma.slot.findUnique({ where: { id: slotId } });
      expect(slot!.isBooked).toBe(false);

      // ── Step 3: User 2 rebooks the same slot ──────────────────────────
      const rebookRes = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ slotId })
        .expect(201);

      expect(rebookRes.body.status).toBe('CONFIRMED');
      expect(rebookRes.body.slot.id).toBe(slotId);

      // Verify slot is booked again
      slot = await prisma.slot.findUnique({ where: { id: slotId } });
      expect(slot!.isBooked).toBe(true);

      // The old CANCELLED appointment was cleaned up by the create() method
      // so only the new CONFIRMED appointment exists
      const allAppts = await prisma.appointment.findMany({
        where: { slotId },
      });
      expect(allAppts).toHaveLength(1);
      expect(allAppts[0].status).toBe('CONFIRMED');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //  Edge case 6: Admin deleting a slot that has bookings
  // ═════════════════════════════════════════════════════════════════════════
  describe('6. Admin deleting a slot with active booking', () => {
    let slotId: string;

    beforeAll(async () => {
      const slot = await createSlot(futureDate(11), '16:00', '16:30');
      slotId = slot.id;

      // Book the slot
      await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ slotId })
        .expect(201);
    });

    afterAll(async () => {
      await prisma.appointment.deleteMany({ where: { slotId } });
      await prisma.slot.deleteMany({ where: { id: slotId } });
    });

    it('should return 400 when admin tries to delete a booked slot', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/slots/${slotId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.message).toBe(
        'Cannot delete a booked slot. Cancel the appointment first.',
      );

      // Verify the slot still exists
      const slot = await prisma.slot.findUnique({ where: { id: slotId } });
      expect(slot).not.toBeNull();
      expect(slot!.isBooked).toBe(true);
    });

    it('should allow deletion after the appointment is cancelled', async () => {
      // Find the appointment for this slot
      const appt = await prisma.appointment.findFirst({
        where: { slotId, status: 'CONFIRMED' },
      });

      // Cancel the appointment
      await request(app.getHttpServer())
        .delete(`/api/appointments/${appt!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Now delete should work
      await request(app.getHttpServer())
        .delete(`/api/slots/${slotId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify slot is gone
      const slot = await prisma.slot.findUnique({ where: { id: slotId } });
      expect(slot).toBeNull();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //  Additional: Slot creation validation
  // ═════════════════════════════════════════════════════════════════════════
  describe('Slot creation validation', () => {
    it('should reject slot with endTime before startTime', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/slots')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date: futureDate(),
          startTime: '14:00',
          endTime: '13:00',
        })
        .expect(400);

      expect(res.body.message).toBe('End time must be after start time');
    });

    it('should reject slot with a past date', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/slots')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date: pastDate(2),
          startTime: '10:00',
          endTime: '10:30',
        })
        .expect(400);

      expect(res.body.message).toBe('Cannot create a slot in the past');
    });

    it('should reject slot with invalid time format', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/slots')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date: futureDate(),
          startTime: '25:00',
          endTime: '10:30',
        })
        .expect(400);

      expect(res.body.message).toContain('startTime must be in HH:mm format');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //  Additional: Auth edge cases
  // ═════════════════════════════════════════════════════════════════════════
  describe('Auth edge cases', () => {
    it('should reject registration with duplicate email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Duplicate',
          email: 'user1-e2e@test.com',
          password: 'password123',
        })
        .expect(409);

      expect(res.body.message).toBe('Email already registered');
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user1-e2e@test.com', password: 'wrong-password' })
        .expect(401);

      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'password123' })
        .expect(401);

      expect(res.body.message).toBe('Invalid credentials');
    });
  });
});
