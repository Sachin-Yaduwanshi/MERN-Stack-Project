# StayPulse — Smart Hotel Booking & Property Management SaaS Platform

[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%206-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express%20ESM-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20%7C%20Mongoose%208-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS%203.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Automated Tests](https://img.shields.io/badge/Tests-74%2F74%20Passing-brightgreen?logo=node.js&logoColor=white)](https://nodejs.org/api/test.html)
[![Production Build](https://img.shields.io/badge/Production%20Build-Clean%20(Vite)-success)](https://vitejs.dev/)

StayPulse is a full-featured, placement-ready multi-property hotel booking and property management SaaS application engineered with the **MERN Stack** (MongoDB, Express, React, Node.js) and Tailwind CSS.

Designed with an enterprise multi-tenant architecture, StayPulse enforces strict **3-role data boundaries** (`GUEST`, `PROPERTY_OWNER`, and `PLATFORM_ADMIN`), database-enforced concurrency control, zero-knowledge guest privacy firewalls, and server-side financial calculations.

---

## 📑 Table of Contents
1. [Project Overview & Key Features](#-project-overview--key-features)
2. [MERN Architecture & Repository Structure](#-mern-architecture--repository-structure)
3. [Prerequisites & Environment Configuration](#-prerequisites--environment-configuration)
4. [Step-by-Step Installation & Setup](#-step-by-step-installation--setup)
5. [Secure Admin Bootstrap Procedure](#-secure-admin-bootstrap-procedure)
6. [REST API Overview & Role Permissions](#-rest-api-overview--role-permissions)
7. [Running Tests & Production Build](#-running-tests--production-build)
8. [Demo Payment Behavior & Standalone MongoDB Boundaries](#-demo-payment-behavior--standalone-mongodb-boundaries)
9. [Architecture & Portfolio Documentation](#-architecture--portfolio-documentation)

---

## 🌟 Project Overview & Key Features

### 1. Guest Experience (`GUEST`)
- **Public Hotel Discovery**: Search hotel listings with multi-attribute filtering (city, state, price range, amenities, keywords) with server-side pagination.
- **Room Catalog & Interactive Availability**: Explore hotel rooms, photo galleries, capacity, and check real-time calendar availability.
- **Atomic Booking Engine**: Reserve rooms with server-side date validation, server-computed stay duration, and automatic 12% Indian hospitality GST calculation.
- **Travel Dashboard**: View upcoming, completed, and cancelled reservations. Perform one-click cancellations that instantly release calendar slots back to the public pool.

### 2. Property Owner SaaS Management (`PROPERTY_OWNER`)
- **Multi-Property CRUD**: List and manage multiple hotels or resorts with address details, cover photos, starting rates, and verified amenities.
- **Room Inventory Control**: Add and update suites with nightly rates, capacities, bed types, and status (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`, `UNAVAILABLE`).
- **Live Owner Analytics**: Real-time revenue aggregates, room counts, and recent guest reservations with guest contact details for arrival coordination.
- **Strict Multi-Tenant Isolation**: Owners can access and modify only their own properties. Cross-tenant access is rejected at the API controller level.
- **Host Profile & Privacy Control**: Upload profile pictures with an option to toggle avatar visibility on public hotel listings.

### 3. Platform Operations & Moderation (`PLATFORM_ADMIN`)
- **System Telemetry & Diagnostics**: Real-time overview of total registered users, active/inactive properties, aggregate bookings, and Gross Booking Volume (GBV).
- **Zero-Knowledge Privacy Firewall**: Platform administrators are strictly denied access (`403 Forbidden`) to private guest booking records, travel histories, and guest profile photos.
- **User Account Oversight**: Administrative oversight of user accounts with one-click suspension and reactivation toggles (with self-suspension prevention).
- **Property Moderation**: Review and moderate hotel listings across all destinations, toggling status between `ACTIVE` and `INACTIVE`.

---

## 🏗 MERN Architecture & Repository Structure

StayPulse follows an industry-standard decoupled architecture:

```
StayPulse/
├── docs/
│   ├── ARCHITECTURE.md          # Full system architecture, ERD, and concurrency design
│   └── PORTFOLIO_DEMO.md        # Screenshot suggestions, demo scripts & interview Q&A
├── frontend/                    # Single Page Application (React 18 + Vite 6 + Tailwind CSS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/          # Navbar, Footer, DashboardLayout
│   │   │   └── ui/              # Button, Card, Badge, Modal, Input, CameraCaptureModal
│   │   ├── context/             # AuthContext (JWT bearer token state & session)
│   │   ├── pages/               # Public pages (Home, Listings, Details) & 3-Role Dashboards
│   │   │   ├── auth/            # LoginPage, RegisterPage
│   │   │   └── dashboard/       # guest/, owner/, admin/ dashboard views
│   │   ├── services/            # Axios API clients (authAPI, propertiesAPI, bookingsAPI, adminAPI)
│   │   ├── App.jsx              # Protected route wrapper with strict role-based gating
│   │   └── main.jsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
├── backend/                     # REST API (Node.js ES Modules + Express + Mongoose 8)
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js            # MongoDB connection & lifecycle event handlers
│   │   ├── controllers/         # authController, propertyController, roomController, bookingController, adminController
│   │   ├── middleware/          # auth.js (verifyToken, authorizeRoles), errorHandler, notFoundHandler
│   │   ├── models/              # User, Property, Room, Booking, RoomReservationSlot
│   │   ├── routes/              # authRoutes, propertyRoutes, roomRoutes, bookingRoutes, adminRoutes, uploadRoutes
│   │   ├── scripts/             # seedAdmin.js, seedData.js
│   │   ├── utils/               # fileUpload.js (Magic byte inspector), token.js (JWT helper)
│   │   ├── app.js               # Express application configuration & security headers
│   │   └── server.js            # Server listener with graceful shutdown
│   ├── tests/                   # 74 Automated Test Cases (Node.js native test runner)
│   │   ├── auth.test.js         # Authentication, hashing & role authorization tests
│   │   ├── property_room.test.js# Property CRUD, room inventory & media upload tests
│   │   ├── booking.test.js      # Concurrency, child process race & lifecycle tests
│   │   ├── dashboard_analytics.test.js # Owner analytics & admin privacy firewall tests
│   │   └── e2e_evaluation.test.js # End-to-end full user journeys (Guest, Owner, Admin)
│   ├── uploads/                 # Local filesystem storage for uploads
│   ├── .env.example             # Backend environment template
│   └── package.json
├── .gitignore                   # Excludes .env, node_modules/, dist/, and uploads/
└── README.md                    # Main project documentation
```

---

## ⚙ Prerequisites & Environment Configuration

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended).
- **npm**: v9.0.0 or higher.
- **MongoDB**: Local MongoDB instance running on `mongodb://127.0.0.1:27017` or a MongoDB Atlas connection URI.

### Backend Environment (`backend/.env`)
Copy `backend/.env.example` to `backend/.env` and configure your parameters:

```bash
cd backend
cp .env.example .env
```

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Backend server port | `5000` |
| `NODE_ENV` | Runtime environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/staypulse` |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `JWT_SECRET` | Secret key for signing JWTs (min 32 chars) | `your_secure_random_jwt_secret_here` |
| `JWT_EXPIRES_IN` | Token expiration duration | `7d` |
| `GST_TAX_RATE` | Indian hospitality GST tax rate | `0.12` (12%) |

### Frontend Environment (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env`:

```bash
cd frontend
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL for backend REST API | `http://localhost:5000/api` |

---

## 🚀 Step-by-Step Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/StayPulse.git
cd StayPulse
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

---

## 🔐 Secure Admin Bootstrap Procedure

In StayPulse, the `PLATFORM_ADMIN` role cannot be self-registered through public endpoints (any public registration attempt receives HTTP `403 Forbidden`). 

An initial administrative account must be provisioned securely via the command-line bootstrap script:

```bash
cd backend
npm run seed:admin
```

This creates an authorized platform administrator:
- **Email**: `admin@staypulse.com`
- **Password**: `Admin12345#`
- **Role**: `PLATFORM_ADMIN`

To seed sample verified properties, room inventories, and sample bookings for demonstration:
```bash
npm run seed:data
```

---

## 🏃 Running the Application

### 1. Start the Backend API
```bash
cd backend
npm run dev
```
The API starts at `http://localhost:5000`. Test the health check endpoint:
```bash
curl http://localhost:5000/api/health
```

### 2. Start the Frontend Application
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📡 REST API Overview & Role Permissions

### Public Endpoints
- `GET /api/health` — System status, uptime, and database connectivity.
- `POST /api/auth/register` — Public registration for `GUEST` and `PROPERTY_OWNER`.
- `POST /api/auth/login` — Authenticate and receive JWT.
- `GET /api/properties` — Discover active properties with city, price, and keyword filters.
- `GET /api/properties/:id` — Property details, amenities, and location.
- `GET /api/properties/:id/rooms` — Available rooms under a property.
- `GET /api/bookings/rooms/:id/availability` — Real-time calendar availability check.

### Guest Endpoints (`GUEST` role required)
- `POST /api/bookings` — Create a reservation with atomic date slot locking.
- `GET /api/bookings/my-bookings` — List personal reservations.
- `PATCH /api/bookings/:id/cancel` — Cancel an eligible reservation and release slots.

### Property Owner Endpoints (`PROPERTY_OWNER` role required)
- `GET /api/properties/owner/my-properties` — List owned properties.
- `POST /api/properties` — Create a new hotel listing.
- `PUT /api/properties/:id` — Update an owned hotel listing.
- `DELETE /api/properties/:id` — Safely remove or deactivate listing.
- `GET /api/rooms/owner/my-rooms` — List rooms across owned properties.
- `POST /api/properties/:id/rooms` — Create room under owned property.
- `PUT /api/rooms/:id` — Update room rate, capacity, or amenities.
- `GET /api/bookings/owner/my-bookings` — View reservations for owned hotels.
- `PATCH /api/bookings/owner/:id/status` — Update booking status (`CONFIRMED`, `COMPLETED`, `CANCELLED`).
- `GET /api/bookings/owner/analytics` — Scoped metrics (properties, rooms, active bookings, revenue).

### Platform Admin Endpoints (`PLATFORM_ADMIN` role required)
- `GET /api/admin/overview` — System-wide telemetry (users, properties, rooms, volume; zero guest data).
- `GET /api/admin/users` — List registered users (guest photos and phone numbers suppressed).
- `PATCH /api/admin/users/:id/status` — Suspend or reactivate user accounts.
- `GET /api/admin/properties` — Review all hotel listings across all owners.
- `PATCH /api/admin/properties/:id/status` — Approve or deactivate hotel listings (`ACTIVE` / `INACTIVE`).

---

## 🧪 Running Tests & Production Build

### Automated Test Suite
StayPulse uses Node.js's built-in test runner (`node --test`) to run **74 tests** across 5 test suites with zero external test framework bloat:

```bash
cd backend
npm test
```

```
> staypulse-backend@1.0.0 test
> node --test tests/**/*.test.js

✔ 14 / 14 Auth Tests (auth.test.js)
✔ 24 / 24 Booking Engine Tests (booking.test.js)
✔  8 /  8 Dashboard Analytics Tests (dashboard_analytics.test.js)
✔ 16 / 16 End-to-End Evaluation Tests (e2e_evaluation.test.js)
✔ 12 / 12 Property & Room Management Tests (property_room.test.js)

ℹ tests 74
ℹ suites 0
ℹ pass 74
ℹ fail 0
ℹ duration_ms 2591.73ms
```

### Production Build Verification
Verify the frontend production bundle:

```bash
cd frontend
npm run build
```

```
vite v6.4.5 building for production...
✓ 1679 modules transformed.
dist/index.html                   0.97 kB │ gzip:   0.55 kB
dist/assets/index-agcJuFpe.css   37.58 kB │ gzip:   6.82 kB
dist/assets/index-BD1UPVi3.js   421.07 kB │ gzip: 114.91 kB
✓ built in 4.04s
```

---

## 💳 Demo Payment Behavior & Standalone MongoDB Boundaries

### Demo Payment Behavior
StayPulse does **not** collect real payment cards or process bank transactions:
- Every booking response explicitly returns `settlementStatus: 'UNPAID_DEMO_RESERVATION'` and `isDemoValidation: true`.
- Revenue metrics on dashboards represent **estimated booking agreement values**, not settled bank funds.
- No dummy payment forms or fake card collection inputs are used.

### Known Standalone MongoDB Transactional Boundaries
- **No Engine-Level Multi-Document Transactions**: Standalone MongoDB deployments (without a replica set) do not support `session.startTransaction()`.
- **The Crash Window**: If an uncatchable catastrophic failure (`kill -9`, physical power loss) occurs in the microsecond window between `await booking.save()` and `RoomReservationSlot.updateMany()`, an unconfirmed `Booking` document could remain in MongoDB with its slots still in `PENDING` status.
- **Mitigating Architecture**: Slots are created with a 60-second lease (`expiresAt`) and a MongoDB TTL index. Both the active application sweep and MongoDB's background TTL thread automatically purge expired pending slots, ensuring that **calendar dates are never permanently blocked**. For recoverable errors, the invariant check `updateResult.matchedCount !== nights` automatically deletes the created `Booking` document immediately.

---

## 📚 Architecture & Portfolio Documentation

For in-depth architectural analysis, database diagrams, and placement demonstration walkthroughs:
- 📖 [**System Architecture & Concurrency Design**](docs/ARCHITECTURE.md)
- 💼 [**Portfolio Demonstration Guide & Interview Q&A**](docs/PORTFOLIO_DEMO.md)
- 📋 [**Comprehensive E2E Evaluation Report**](https://github.com/your-username/StayPulse)

---
## 🎥 Project Demo Video

Watch the StayPulse project demo to understand its features and functionality.

[▶️ Watch StayPulse Demo Video](https://drive.google.com/file/d/1XgsX3EoOt32RuRR1JmVEwhEHvkQzl4fj/view?usp=sharing)

---

## 📄 License
This project is licensed under the MIT License.
