# 📅 Appointment Booking System

A full-stack web application that allows users to book and manage appointment slots with service providers (consultants). Admins can manage availability, create time slots, and view all bookings.

![Tech Stack](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Tech Stack](https://img.shields.io/badge/NestJS-10-red?logo=nestjs)
![Tech Stack](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![Tech Stack](https://img.shields.io/badge/Prisma-5-teal?logo=prisma)
![Tech Stack](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tech Stack](https://img.shields.io/badge/Tailwind_CSS-3-38bdf8?logo=tailwindcss)

---

## ✨ Features

### For Users
- 🔐 Register and login with email/password
- 📅 Browse available consultation time slots by date
- ⚡ Book appointments with a single click
- 📋 View upcoming appointments in a personal dashboard
- ❌ Cancel appointments

### For Admins
- 📊 Admin dashboard with booking statistics
- ➕ Create available time slots
- 🗑️ Delete unused time slots
- 📋 View all bookings with client details
- 🔍 Filter by date

### System Features
- 🔒 JWT-based authentication
- 🛡️ Role-based access control (Admin/User)
- 🚫 Double booking prevention
- ✅ Input validation with class-validator
- 📱 Fully responsive design (mobile + desktop)
- 🔄 Loading states and error handling
- 📭 Empty states for better UX

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| Next.js 14 (App Router) | React framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Axios | HTTP client |
| React Hot Toast | Notifications |
| React Icons | Icon library |
| date-fns | Date utilities |

### Backend
| Technology | Purpose |
|-----------|---------|
| NestJS 10 | Node.js framework |
| TypeScript | Type safety |
| Prisma ORM | Database access |
| PostgreSQL | Database |
| Passport.js + JWT | Authentication |
| class-validator | DTO validation |
| bcrypt | Password hashing |

---

## 📁 Project Structure

```
appointment-booking-system/
├── backend/                    # NestJS API
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # Seed data
│   └── src/
│       ├── main.ts             # Entry point
│       ├── app.module.ts       # Root module
│       ├── auth/               # Authentication module
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── auth.module.ts
│       │   ├── jwt.strategy.ts
│       │   ├── dto/
│       │   └── guards/
│       ├── slots/              # Slots management
│       │   ├── slots.controller.ts
│       │   ├── slots.service.ts
│       │   ├── slots.module.ts
│       │   └── dto/
│       ├── appointments/       # Appointment booking
│       │   ├── appointments.controller.ts
│       │   ├── appointments.service.ts
│       │   ├── appointments.module.ts
│       │   └── dto/
│       └── prisma/             # Database service
│           ├── prisma.service.ts
│           └── prisma.module.ts
│
├── frontend/                   # Next.js App
│   └── src/
│       ├── app/
│       │   ├── page.tsx        # Home page
│       │   ├── layout.tsx      # Root layout
│       │   ├── booking/        # Booking page
│       │   ├── login/          # Login page
│       │   ├── register/       # Register page
│       │   ├── dashboard/      # User dashboard
│       │   ├── admin/          # Admin dashboard
│       │   └── success/        # Booking confirmation
│       ├── components/
│       │   ├── layout/         # Navbar, Footer
│       │   ├── ui/             # SlotCard, DatePicker, etc.
│       │   └── Providers.tsx   # Context providers
│       ├── hooks/              # Custom hooks (useAuth)
│       ├── services/           # API service layer
│       └── types/              # TypeScript interfaces
│
└── README.md
```

---

## 🗄️ Database Schema

```
User
├── id (UUID, PK)
├── name (String)
├── email (String, unique)
├── password (String, hashed)
├── role (ADMIN | USER)
├── createdAt
└── updatedAt

Slot
├── id (UUID, PK)
├── date (Date)
├── startTime (String, HH:mm)
├── endTime (String, HH:mm)
├── isBooked (Boolean)
├── createdAt
└── updatedAt

Appointment
├── id (UUID, PK)
├── userId (FK → User)
├── slotId (FK → Slot, unique)
├── status (CONFIRMED | CANCELLED)
├── createdAt
└── updatedAt
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login | No |

### Slots
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/slots` | Get available slots | No |
| GET | `/api/slots/all` | Get all slots (admin) | Admin |
| POST | `/api/slots` | Create a slot | Admin |
| DELETE | `/api/slots/:id` | Delete a slot | Admin |

### Appointments
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/appointments` | Book an appointment | User |
| GET | `/api/appointments` | Get appointments | User/Admin |
| GET | `/api/appointments/my` | Get my appointments | User |
| DELETE | `/api/appointments/:id` | Cancel appointment | User/Admin |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL (local or cloud: Supabase / Neon)
- npm or yarn

### 1. Clone the repository
```bash
git clone https://github.com/your-username/appointment-booking-system.git
cd appointment-booking-system
```

### 2. Backend Setup
```bash
cd backend
npm install

# Create .env file from example
cp .env.example .env
# Edit .env with your database URL and JWT secret

# Run database migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed the database (creates admin user + sample slots)
npm run seed

# Start development server
npm run start:dev
```

The backend will run on `http://localhost:3001`

### 3. Frontend Setup
```bash
cd frontend
npm install

# Create .env file
cp .env.example .env.local

# Start development server
npm run dev
```

The frontend will run on `http://localhost:3000`

### 4. Demo Login
- **Admin**: admin@appointbook.com / admin123
- **User**: Register a new account

---

## 🔐 Environment Variables

### Backend (`.env`)
```env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://user:password@localhost:5432/appointment_booking?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRATION="7d"
FRONTEND_URL="http://localhost:3000"
```

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## 🌐 Deployment

### Frontend → Vercel
1. Connect your GitHub repository to Vercel
2. Set root directory to `frontend`
3. Add environment variable `NEXT_PUBLIC_API_URL`
4. Deploy

### Backend → Render / Railway
1. Connect your GitHub repository
2. Set root directory to `backend`
3. Set build command: `npm install && npx prisma generate && npm run build`
4. Set start command: `npm run start:prod`
5. Add environment variables (`DATABASE_URL`, `JWT_SECRET`, etc.)
6. Deploy

### Database → Supabase / Neon
1. Create a new PostgreSQL database
2. Copy the connection string
3. Add to backend `.env` as `DATABASE_URL`
4. Run `npx prisma migrate deploy`

---

## 📋 Portfolio Presentation

### Project Title
**Appointment Booking System**

### Description
A full-stack web application that allows users to book and manage appointment slots while enabling administrators to manage availability and bookings. Built with modern technologies and production-grade patterns.

### Key Features
- ✅ JWT authentication with role-based access control
- ✅ Real-time slot availability with double-booking prevention
- ✅ User dashboard for managing appointments
- ✅ Admin dashboard with statistics and slot management
- ✅ Responsive design for mobile and desktop
- ✅ RESTful API with input validation
- ✅ PostgreSQL database with Prisma ORM
- ✅ Clean, modular code architecture

### Tech Stack
`Next.js` · `NestJS` · `TypeScript` · `PostgreSQL` · `Prisma` · `Tailwind CSS` · `JWT` · `REST API`

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).
