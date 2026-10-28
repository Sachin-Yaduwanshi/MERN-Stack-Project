# StayPulse — Portfolio Demonstration Guide & Technical Interview Prep

This guide provides a structured walkthrough for demonstrating **StayPulse** in portfolio presentations, live code reviews, and placement interviews.

---

## 1. Key Screens for Portfolio Showcase

The following screens represent the highest-value views for screenshots and portfolio presentations:

### 1.1 Public Landing Page (`/`)
- **Key Visual Elements**: Hero section with search bar (destination, dates, guests), destination cards (Jaipur, Goa, Manali, Udaipur), value proposition highlights, and dynamic header with role indicators.
- **Story to Tell**: "Engineered as a SaaS hotel marketplace designed for high conversion, responsive across mobile and desktop, with zero external template dependencies."

### 1.2 Hotel Exploration & Dynamic Filters (`/hotels`)
- **Key Visual Elements**: Interactive location filter pills (Jaipur, Goa, Manali, Udaipur), price range slider, amenities checkboxes, real-time search query bar, and responsive property cards showing starting rates and verified ratings.
- **Story to Tell**: "Server-backed pagination and multi-parameter filtering powered by compound MongoDB indexes."

### 1.3 Hotel Details & Room Booking Modal (`/hotels/:id`)
- **Key Visual Elements**: Hotel cover image, gallery, verified amenities, 'Meet Your Host' section (respecting host avatar privacy), room cards with capacity and nightly rates, and the interactive reservation drawer.
- **Story to Tell**: "Server-calculated pricing with automatic 12% GST breakdown, client-side input validation, and real-time database-backed calendar conflict detection."

### 1.4 Guest Travel Dashboard (`/dashboard/guest`)
- **Key Visual Elements**: Welcome metric cards (Confirmed Upcoming Stays, Completed Stays, Tenant Privacy Status), Next Stay Preview Card, and the interactive Bookings tab with status filtering and one-click cancellation modals.
- **Story to Tell**: "Strict tenant isolation: Guests can only inspect and manage their own reservations. Cancellations immediately release reservation slots back to the public pool."

### 1.5 Property Owner SaaS Dashboard (`/dashboard/owner`)
- **Key Visual Elements**: Live metrics (Properties Listed, Total Rooms, Active Reservations, Property Revenue), Recent Guest Reservations table with guest contact info, and Property/Room management forms.
- **Story to Tell**: "Multi-property management where queries and mutations are strictly scoped to properties owned by the authenticated user. Includes a host avatar visibility toggle to control guest-facing presence."

### 1.6 Platform Operations & Health Console (`/dashboard/admin`)
- **Key Visual Elements**: High-level platform telemetry (Total Users, Active Properties, Aggregate Bookings, Gross Booking Volume), User Account Management table with one-click suspension toggles, and Property Moderation controls.
- **Story to Tell**: "Zero-Knowledge Guest Privacy Firewall: Administrators have oversight of platform health and moderation tools, but are categorically blocked from viewing private guest booking records, travel histories, or profile photos."

---

## 2. Concise Live Demonstration Script

### Walkthrough 1: The Guest Experience
1. **Search**: Navigate to `/hotels` and select **Manali**.
2. **Inspect**: Open **"The Himalayan Pine Chalet"** and view room inventory.
3. **Validate**: Attempt booking with checkout earlier than check-in -> observe instant validation error.
4. **Book**: Select valid future dates (e.g. 3 nights) and click **Reserve Room**.
5. **Confirm**: Review the confirmed reservation reference (`SP-YYYY-XXXX`), server-calculated 12% GST, and demo settlement status.
6. **Manage**: Navigate to `/dashboard/guest` -> view the active stay -> click **Cancel Reservation** -> observe instant status update to `CANCELLED` and verification that dates are released.

### Walkthrough 2: The Property Owner Experience
1. **Authenticate**: Log in as a Property Owner (e.g. `amit@staypulse.com`).
2. **Dashboard**: Navigate to `/dashboard/owner` -> observe live revenue metrics and active reservations for owned hotels.
3. **Inventory Management**: Go to **Properties** -> add a new listing. Go to **Rooms** -> create a new suite with price and capacity.
4. **Privacy Toggle**: Open **Profile** -> toggle **"Hide avatar on public hotel listings"** -> inspect public listing to demonstrate the host photo is suppressed and direct URL returns HTTP 403.
5. **Cross-Tenant Attack Demonstration**: Open developer tools and attempt a `PUT /api/properties/:otherOwnerId` -> demonstrate backend returns HTTP `403 Forbidden`.

### Walkthrough 3: The Platform Administrator Experience
1. **Authenticate**: Log in with authorized admin credentials (`admin@staypulse.com`).
2. **Telemetry**: Open `/dashboard/admin` -> observe platform-wide aggregates and server uptime.
3. **Privacy Firewall**: Attempt opening `/api/bookings/:bookingId` directly -> show backend immediately returns **403 Forbidden**.
4. **User Management**: Open `/dashboard/admin/users` -> demonstrate that guest profile photos and phone numbers are suppressed from admin view -> suspend a test account -> verify that suspended account is immediately denied login.
5. **Property Moderation**: Open `/dashboard/admin/properties` -> toggle a hotel listing to `INACTIVE` -> demonstrate that the hotel immediately disappears from public search results.

---

## 3. Placement & Senior Technical Interview Q&A

### Q1: How did you handle race conditions when two users attempt to book the same room for the same dates simultaneously?
> **Answer**:  
> "In-memory locks like Node.js mutexes only work within a single process and fail across multiple server instances or clusters. Instead, I delegated concurrency control directly to **MongoDB's WiredTiger storage engine**.  
> I created a `RoomReservationSlot` collection where every reserved calendar night `[checkIn, checkOut)` is represented as a discrete document. I enforced a **strict unique compound index** on `{ room: 1, dateString: 1 }`. When two concurrent requests execute `insertMany()`, MongoDB's storage engine atomically allows only one request to insert the slot documents. The losing process immediately catches an `E11000 Duplicate Key Error`, rolls back any pending slots under its unique `lockToken`, and returns an HTTP `409 Conflict`."

---

### Q2: How does your application recover from an abandoned reservation if the server crashes mid-request?
> **Answer**:  
> "I implemented a **two-phase lease-based lock pattern**. When a guest initiates a booking, slots are inserted in `PENDING` status with a unique UUID `lockToken` and an `expiresAt` timestamp set to 60 seconds into the future.  
> MongoDB maintains a TTL index on `expiresAt` with `expireAfterSeconds: 0`. Additionally, every availability check runs an active application sweep (`cleanupExpiredReservationSlots()`). If a worker process terminates abruptly before saving the booking, the lease simply expires and is safely reclaimed. When the booking succeeds, the confirmation step executes an `$unset: { expiresAt: 1 }` and updates status to `CONFIRMED`, permanently securing the reservation."

---

### Q3: What is the transactional limitation of running on standalone MongoDB, and how did you architect around it?
> **Answer**:  
> "Standalone MongoDB does not support multi-document ACID transactions (`session.startTransaction()`), which require a replica set. Therefore, atomic guarantees across two separate collections (`Booking` and `RoomReservationSlot`) cannot be enforced by the database engine in a single transaction.  
> To handle this, I engineered a **compensating transaction pattern**:
> 1. Slots are inserted first under a temporary 60-second lease with a `lockToken`.
> 2. The `Booking` document is saved.
> 3. An atomic conditional update confirms the slots matching `{ lockToken, status: 'PENDING' }`.
> 4. An invariant check verifies `updateResult.matchedCount === nights`. If it does not match (meaning the lease timed out or a slot was missing), the application executes a compensating action: it immediately deletes the created `Booking` document and purges any remaining slots under that `lockToken`.  
> While an abrupt physical power loss in the microsecond between `booking.save()` and slot confirmation could leave an unconfirmed booking document, the slots will expire after 60 seconds, guaranteeing that **room calendar dates are never permanently blocked**."

---

### Q4: Explain the Privacy Firewall you designed for the Platform Administrator.
> **Answer**:  
> "In many SaaS platforms, administrators have unrestricted access to all tables. StayPulse enforces a strict zero-knowledge privacy architecture for guest travel data:
> 1. Platform Admins have access to system-level aggregates (total bookings, gross booking volume, user distribution, property moderation).
> 2. The endpoint `GET /api/bookings/:id` specifically blocks `PLATFORM_ADMIN` with HTTP `403 Forbidden`. Admins cannot inspect private guest booking records, dates of travel, or room choices.
> 3. The `GET /api/admin/users` endpoint passes user objects through a sanitization transform that strips `avatar` and `phone` for all users with `role: 'GUEST'`.
> 4. The image streaming endpoint `GET /api/uploads/profiles/:filename` verifies token ownership, preventing administrators or third parties from scraping guest profile photos."

---

### Q5: How do you prevent clients from manipulating booking prices or tax totals?
> **Answer**:  
> "The backend operates under a zero-trust model for all client-supplied financial figures. When a guest submits a booking request, the client supplies only `roomId`, `checkInDate`, `checkOutDate`, and `guestsCount`.  
> The backend verifies the room in MongoDB, calculates the stay duration in calendar nights, fetches `Room.pricePerNight` from the database, and calculates the subtotal (`nights * pricePerNight`). It then calculates Indian hospitality GST (12% by default, configurable via `GST_TAX_RATE`) and computes `totalPrice = subtotal + taxes`. Any client-supplied price or subtotal fields in the request body are completely discarded."
