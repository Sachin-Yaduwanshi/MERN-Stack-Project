# StayPulse System Architecture & Data Design

This document details the software architecture, database design, role-based authorization matrix, and concurrency safety mechanisms implemented in **StayPulse**.

---

## 1. System Architecture

StayPulse is engineered as a decoupled, multi-tier Single Page Application (SPA) with a RESTful backend API powered by the MERN stack.

```mermaid
flowchart TD
    subgraph ClientTier ["Frontend Tier (Client SPA)"]
        Browser["Modern Web Browser"]
        Vite["Vite 6 + React 18 SPA"]
        Router["React Router v6 Protected Routing"]
        AuthCtx["AuthContext (JWT Bearer Token Management)"]
        Axios["Axios API Client + Interceptors"]
    end

    subgraph GatewayTier ["Security & Routing Tier (Express.js)"]
        Express["Express Application (Node.js ES Modules)"]
        Cors["CORS Origin Validation"]
        Helmet["Helmet Security Headers"]
        RateLimit["Body Limiters (10MB JSON / URL-Encoded)"]
        AuthMW["verifyToken & authorizeRoles Middleware"]
    end

    subgraph ServiceTier ["Application & Controller Layer"]
        AuthCtrl["authController.js"]
        PropCtrl["propertyController.js"]
        RoomCtrl["roomController.js"]
        BookCtrl["bookingController.js"]
        AdminCtrl["adminController.js"]
        UploadCtrl["uploadRoutes.js (Magic Byte Validator)"]
    end

    subgraph DataTier ["Persistence & Storage Layer"]
        Mongoose["Mongoose ODM (Schema & Hook Validation)"]
        WiredTiger["MongoDB WiredTiger Storage Engine"]
        UniqueIdx["Unique Compound Index { room: 1, dateString: 1 }"]
        TTLIdx["TTL Daemon Index { expiresAt: 1 }"]
        DiskStorage["Safe Local Filesystem Storage (uploads/)"]
    end

    Browser --> Vite
    Vite --> Router
    Router --> AuthCtx
    AuthCtx --> Axios
    Axios -->|HTTP + JWT Bearer| Express
    Express --> Cors
    Cors --> Helmet
    Helmet --> RateLimit
    RateLimit --> AuthMW

    AuthMW -->|Public / Authenticated| AuthCtrl
    AuthMW -->|Public / Owner Scoped| PropCtrl
    AuthMW -->|Public / Owner Scoped| RoomCtrl
    AuthMW -->|Guest / Owner Scoped| BookCtrl
    AuthMW -->|Platform Admin Only| AdminCtrl
    AuthMW -->|Owner / User Scoped| UploadCtrl

    AuthCtrl --> Mongoose
    PropCtrl --> Mongoose
    RoomCtrl --> Mongoose
    BookCtrl --> Mongoose
    AdminCtrl --> Mongoose
    UploadCtrl --> DiskStorage

    Mongoose --> WiredTiger
    WiredTiger --> UniqueIdx
    WiredTiger --> TTLIdx
```

---

## 2. Database Relationship Diagram (ERD)

The data model maintains strict multi-tenant boundaries and guarantees atomic calendar reservations across multi-process clusters.

```mermaid
erDiagram
    USER ||--o{ PROPERTY : "owns"
    USER ||--o{ BOOKING : "reserves as guest"
    PROPERTY ||--|{ ROOM : "contains inventory"
    PROPERTY ||--o{ BOOKING : "receives"
    ROOM ||--o{ BOOKING : "is booked in"
    ROOM ||--o{ ROOM_RESERVATION_SLOT : "allocates night"
    BOOKING ||--o{ ROOM_RESERVATION_SLOT : "claims confirmed nights"

    USER {
        ObjectId _id PK
        string name
        string email UK "Unique index"
        string password "bcrypt hash (never exposed in API)"
        string role "GUEST | PROPERTY_OWNER | PLATFORM_ADMIN"
        string phone "Optional contact phone"
        string avatar "Optional profile photo path"
        boolean ownerAvatarVisible "Controls public host avatar visibility"
        string status "ACTIVE | SUSPENDED"
        date createdAt
        date updatedAt
    }

    PROPERTY {
        ObjectId _id PK
        ObjectId owner FK "References User"
        string name
        string tagline
        string description
        object location "address, city, state, country, zipCode"
        number startingPrice "Minimum room rate"
        string coverImage "Primary hotel photo"
        array images "Gallery photos"
        array amenities "WiFi, Pool, Dining, etc."
        string status "ACTIVE | INACTIVE"
        number rating "Platform review score"
        number reviewsCount
        date createdAt
        date updatedAt
    }

    ROOM {
        ObjectId _id PK
        ObjectId property FK "References Property"
        string roomType "Suite, Deluxe, Standard, etc."
        string description
        number pricePerNight "Base rate before tax"
        number capacity "Maximum guests allowed"
        string bedType
        array amenities
        array images
        string status "AVAILABLE | OCCUPIED | MAINTENANCE | UNAVAILABLE"
        date createdAt
        date updatedAt
    }

    BOOKING {
        ObjectId _id PK
        string bookingReference UK "Unique reference SP-YYYY-XXXX"
        ObjectId guest FK "References User (Guest)"
        ObjectId property FK "References Property"
        ObjectId room FK "References Room"
        date checkInDate "Normalized to local midnight"
        date checkOutDate "Normalized to local midnight"
        number guestsCount
        number nights "Server-calculated stay duration"
        number pricePerNight "Server-verified room rate"
        number subtotal "nights * pricePerNight"
        number taxes "Server-calculated GST (12%)"
        number totalPrice "subtotal + taxes"
        string status "PENDING | CONFIRMED | CHECKED_IN | COMPLETED | CANCELLED"
        string cancellationReason
        date cancelledAt
        date createdAt
        date updatedAt
    }

    ROOM_RESERVATION_SLOT {
        ObjectId _id PK
        ObjectId room FK "References Room"
        string dateString "YYYY-MM-DD calendar day"
        ObjectId booking FK "References Booking (null while pending)"
        string status "PENDING | CONFIRMED"
        string lockToken "UUID lease identifier"
        date expiresAt "TTL index timestamp (null when confirmed)"
        date createdAt
        date updatedAt
    }
```

---

## 3. Role & Authorization Matrix

StayPulse enforces three distinct user roles with zero permission bleeding.

| Endpoint / Feature | Method | GUEST | PROPERTY_OWNER | PLATFORM_ADMIN | Unauthenticated |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Public Hotel Search & Filtering** | `GET /api/properties` | ✅ | ✅ | ✅ | ✅ |
| **Public Room Catalog** | `GET /api/properties/:id/rooms` | ✅ | ✅ | ✅ | ✅ |
| **Room Calendar Availability** | `GET /api/bookings/rooms/:id/availability` | ✅ | ✅ | ✅ | ✅ |
| **Account Registration** | `POST /api/auth/register` | ✅ (Self) | ✅ (Self) | ❌ (Blocked) | ✅ |
| **User Login** | `POST /api/auth/login` | ✅ | ✅ | ✅ | ✅ |
| **View Current Profile** | `GET /api/auth/me` | ✅ | ✅ | ✅ | ❌ (401) |
| **Update Personal Profile** | `PUT /api/auth/profile` | ✅ | ✅ (Can toggle avatar) | ✅ | ❌ (401) |
| **Create Hotel Listing** | `POST /api/properties` | ❌ (403) | ✅ (Auto-assigned) | ❌ (403) | ❌ (401) |
| **Manage Own Properties** | `PUT/DELETE /api/properties/:id` | ❌ (403) | ✅ (Own only) | ❌ (403) | ❌ (401) |
| **Manage Own Rooms** | `POST/PUT/DELETE /api/rooms` | ❌ (403) | ✅ (Own only) | ❌ (403) | ❌ (401) |
| **Book Room Reservation** | `POST /api/bookings` | ✅ | ❌ (403) | ❌ (403) | ❌ (401) |
| **View Own Guest Stays** | `GET /api/bookings/my-bookings` | ✅ (Own only) | ❌ (403) | ❌ (403) | ❌ (401) |
| **Cancel Own Guest Stay** | `PATCH /api/bookings/:id/cancel` | ✅ (Own only) | ❌ (403) | ❌ (403) | ❌ (401) |
| **View Hotel Reservations** | `GET /api/bookings/owner/my-bookings` | ❌ (403) | ✅ (Own hotels) | ❌ (403) | ❌ (401) |
| **Update Stay Status** | `PATCH /api/bookings/owner/:id/status`| ❌ (403) | ✅ (Own hotels) | ❌ (403) | ❌ (401) |
| **Owner Dashboard Analytics** | `GET /api/bookings/owner/analytics` | ❌ (403) | ✅ (Scoped to own) | ❌ (403) | ❌ (401) |
| **Inspect Individual Booking**| `GET /api/bookings/:id` | ✅ (Own only) | ✅ (Own hotels) | ❌ (403 Strict) | ❌ (401) |
| **View Guest Profile Photos**| `GET /api/uploads/profiles/:file` | ✅ (Own photo) | ✅ (Booked guests) | ❌ (403 Strict) | ❌ (401) |
| **Platform System Overview** | `GET /api/admin/overview` | ❌ (403) | ❌ (403) | ✅ (Aggregates) | ❌ (401) |
| **User Oversight & Moderation**| `GET/PATCH /api/admin/users` | ❌ (403) | ❌ (403) | ✅ (Privacy on) | ❌ (401) |
| **Property Moderation** | `GET/PATCH /api/admin/properties` | ❌ (403) | ❌ (403) | ✅ | ❌ (401) |

---

## 4. Booking Concurrency & Orphaned Slot Recovery

### 4.1 Cross-Process Mutual Exclusivity
In multi-core server environments (e.g. Node.js clusters, multiple container replicas), in-memory mutexes (such as `AsyncMutex` or Javascript Map locks) cannot protect against simultaneous overlapping bookings. StayPulse delegates mutual exclusivity directly to **MongoDB's WiredTiger storage engine**:

```javascript
// Enforces zero overlapping date collisions at the storage engine level
roomReservationSlotSchema.index({ room: 1, dateString: 1 }, { unique: true });
```
When two concurrent requests attempt to reserve the same room on the same date string (`YYYY-MM-DD`), WiredTiger atomically allows only one document insertion. The competing process immediately catches an `E11000 Duplicate Key Error` and safely returns HTTP `409 Conflict`.

### 4.2 The Two-Phase Lease-Based Lock Pattern

```mermaid
sequenceDiagram
    autonumber
    actor Guest as Guest Client
    participant API as Booking Controller
    participant WiredTiger as MongoDB Storage Engine
    participant Sweeper as Active Sweep & TTL Daemon

    Guest->>API: POST /api/bookings (roomId, checkIn, checkOut)
    API->>Sweeper: cleanupExpiredReservationSlots()
    Note over Sweeper: Deletes expired abandoned slots (expiresAt < now)
    API->>WiredTiger: insertMany(slotDocs) with lockToken & 60s expiresAt
    Note over WiredTiger: Strict Unique Index { room: 1, dateString: 1 }

    alt Overlapping Date Collision
        WiredTiger-->>API: E11000 Duplicate Key Error
        API->>WiredTiger: deleteMany({ lockToken })
        API-->>Guest: 409 Conflict ("Room is already reserved")
    else Slots Acquired Successfully
        WiredTiger-->>API: Slots Inserted (status: PENDING)
        API->>WiredTiger: new Booking().save()
        API->>WiredTiger: updateMany(slots: lockToken, status: PENDING) -> $set CONFIRMED, $unset expiresAt

        alt Confirmation Invariant Check Passes (matchedCount === nights)
            API-->>Guest: 201 Created (Confirmed Booking, SP-YYYY-XXXX, Demo Notice)
        else Lock Expired or Slot Lost (matchedCount !== nights)
            API->>WiredTiger: Compensating Action: findByIdAndDelete(booking._id)
            API->>WiredTiger: deleteMany({ lockToken })
            API-->>Guest: 409 Conflict ("Reservation timed out. Please retry.")
        end
    end
```

---

## 5. Standalone MongoDB Limitations & Mitigations

### 5.1 Honest Architectural Boundaries
- **No Multi-Document Transactions**: Standalone MongoDB deployments (without replica set clustering) do not support multi-document ACID transactions (`session.startTransaction()`).
- **The Crash Window**: If an uncatchable catastrophic failure (e.g., `kill -9` or physical server power loss) occurs in the microsecond window **after** `await booking.save()` finishes but **before** `RoomReservationSlot.updateMany()` executes, an unconfirmed `Booking` document could exist in the database with its slots still in `PENDING` status.

### 5.2 Mitigations Implemented
1. **Time-To-Live (TTL) Automatic Reclamation**: The reservation slots are created with a 60-second `expiresAt` lease and an active TTL index (`{ expireAfterSeconds: 0 }`). Both MongoDB's background TTL thread and the application's active pre-check sweep will automatically purge the unconfirmed slots.
2. **Dates Never Permanently Blocked**: Because the slots expire after 60 seconds, calendar dates are never permanently locked, and subsequent booking attempts can safely reserve the room.
3. **Compensating Rollbacks on Recoverable Errors**: For all application-level errors, timeouts, or partial slot losses, the invariant check `updateResult.matchedCount !== nights` automatically deletes the created `Booking` document immediately.
