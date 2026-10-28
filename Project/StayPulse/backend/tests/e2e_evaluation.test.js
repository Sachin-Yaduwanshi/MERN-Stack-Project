import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Property from '../src/models/Property.js';
import Room from '../src/models/Room.js';
import Booking from '../src/models/Booking.js';
import RoomReservationSlot from '../src/models/RoomReservationSlot.js';
import { connectDB } from '../src/config/db.js';
import { generateToken } from '../src/utils/token.js';

let server;
let baseUrl;

const timestamp = Date.now();
const guestEmail = `e2e_guest_${timestamp}@staypulse.test`;
const guest2Email = `e2e_guest2_${timestamp}@staypulse.test`;
const owner1Email = `e2e_owner1_${timestamp}@staypulse.test`;
const owner2Email = `e2e_owner2_${timestamp}@staypulse.test`;

let guestToken, guest2Token, owner1Token, owner2Token, adminToken;
let guestUser, guest2User, owner1User, owner2User, adminUser;
let createdPropertyId, createdRoomId, createdBookingId;

before(async () => {
  await connectDB();

  // Find or create Platform Administrator
  adminUser = await User.findOne({ role: 'PLATFORM_ADMIN' });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'System Administrator',
      email: `admin_e2e_${timestamp}@staypulse.test`,
      password: 'Password123#',
      role: 'PLATFORM_ADMIN',
    });
  }
  adminToken = generateToken(adminUser._id, adminUser.role);

  // Start HTTP server on dynamic port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  // Cleanup all documents created in this E2E run
  if (createdRoomId) {
    await RoomReservationSlot.deleteMany({ room: createdRoomId });
    await Booking.deleteMany({ room: createdRoomId });
    await Room.deleteMany({ _id: createdRoomId });
  }
  if (createdPropertyId) {
    await Property.deleteMany({ _id: createdPropertyId });
  }
  await User.deleteMany({
    email: { $in: [guestEmail, guest2Email, owner1Email, owner2Email] },
  });

  await mongoose.disconnect();
});

// ==========================================
// 1. GUEST USER JOURNEY
// ==========================================

test('E2E Guest 1: Register and Log In with JWT', async () => {
  // 1. Register Guest
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'E2E Traveler',
      email: guestEmail,
      password: 'Password123#',
      role: 'GUEST',
      phone: '+91 91111 22222',
    }),
  });

  const regData = await regRes.json();
  assert.equal(regRes.status, 201);
  assert.equal(regData.success, true);
  assert.equal(regData.user.role, 'GUEST');
  assert.ok(regData.token);
  assert.equal(regData.user.password, undefined, 'Password hash must never be returned');

  guestUser = regData.user;
  guestToken = regData.token;

  // 2. Log In
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: guestEmail,
      password: 'Password123#',
    }),
  });

  const loginData = await loginRes.json();
  assert.equal(loginRes.status, 200);
  assert.ok(loginData.token);
  assert.equal(loginData.user.email, guestEmail);
});

test('E2E Guest 2: Register Second Guest for Race & Concurrency Tests', async () => {
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Second Traveler',
      email: guest2Email,
      password: 'Password123#',
      role: 'GUEST',
      phone: '+91 93333 44444',
    }),
  });

  const regData = await regRes.json();
  assert.equal(regRes.status, 201);
  guest2User = regData.user;
  guest2Token = regData.token;
});

// ==========================================
// 2. PROPERTY OWNER JOURNEY
// ==========================================

test('E2E Owner 1: Register, Log In, Create Property and Add Rooms', async () => {
  // 1. Register Owner 1
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'E2E Hotelier',
      email: owner1Email,
      password: 'Password123#',
      role: 'PROPERTY_OWNER',
      phone: '+91 94444 55555',
    }),
  });

  const regData = await regRes.json();
  assert.equal(regRes.status, 201);
  owner1User = regData.user;
  owner1Token = regData.token;

  // 2. Create Property
  const propRes = await fetch(`${baseUrl}/api/properties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner1Token}`,
    },
    body: JSON.stringify({
      name: `E2E Heritage Retreat ${timestamp}`,
      tagline: 'Authentic Mountain Sanctuary',
      description: 'Handcrafted luxury resort surrounded by pine forests.',
      location: {
        address: '500 Timber Trail',
        city: 'Manali',
        state: 'Himachal Pradesh',
        country: 'India',
      },
      startingPrice: 4500,
      coverImage: '/uploads/properties/e2e_cover.jpg',
      amenities: ['Free WiFi', 'Mountain View', 'Fireplace', 'Heated Pool'],
      status: 'ACTIVE',
    }),
  });

  const propData = await propRes.json();
  assert.equal(propRes.status, 201);
  assert.equal(propData.success, true);
  createdPropertyId = propData.property._id;
  assert.ok(createdPropertyId);

  // 3. Update Property
  const updatePropRes = await fetch(`${baseUrl}/api/properties/${createdPropertyId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner1Token}`,
    },
    body: JSON.stringify({
      startingPrice: 4800,
    }),
  });
  const updatePropData = await updatePropRes.json();
  assert.equal(updatePropRes.status, 200);
  assert.equal(updatePropData.property.startingPrice, 4800);

  // 4. Create Room under Property
  const roomRes = await fetch(`${baseUrl}/api/properties/${createdPropertyId}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner1Token}`,
    },
    body: JSON.stringify({
      roomType: 'Deluxe Pine Chalet',
      description: 'Private balcony overlooking the valley.',
      pricePerNight: 4800,
      capacity: 3,
      bedType: '1 King Bed + 1 Daybed',
      amenities: ['Fireplace', 'Free WiFi', 'Balcony', 'Room Service'],
      status: 'AVAILABLE',
    }),
  });

  const roomData = await roomRes.json();
  assert.equal(roomRes.status, 201);
  createdRoomId = roomData.room._id;
  assert.ok(createdRoomId);

  // 5. Update Room
  const updateRoomRes = await fetch(`${baseUrl}/api/rooms/${createdRoomId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner1Token}`,
    },
    body: JSON.stringify({
      pricePerNight: 5000,
    }),
  });
  const updateRoomData = await updateRoomRes.json();
  assert.equal(updateRoomRes.status, 200);
  assert.equal(updateRoomData.room.pricePerNight, 5000);

  // 6. Verification: Pending property is NOT visible in public search before admin approval
  const preApprovalSearch = await fetch(`${baseUrl}/api/properties?city=Manali`);
  const preApprovalData = await preApprovalSearch.json();
  assert.equal(preApprovalSearch.status, 200);
  const preList = preApprovalData.data || [];
  assert.ok(!preList.some((p) => p._id === createdPropertyId), 'Pending property must not appear in public search');

  // 7. Platform Admin approves the property application
  const approveRes = await fetch(`${baseUrl}/api/admin/properties/${createdPropertyId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'ACTIVE' }),
  });
  assert.equal(approveRes.status, 200);
  const approveData = await approveRes.json();
  assert.equal(approveData.property.status, 'ACTIVE');
});

// ==========================================
// 3. GUEST SEARCH & BOOKING WORKFLOW
// ==========================================

test('E2E Guest: Search Properties, Inspect Details & Room Inventory', async () => {
  // Search for Manali hotels
  const searchRes = await fetch(`${baseUrl}/api/properties?city=Manali`);
  const searchData = await searchRes.json();
  assert.equal(searchRes.status, 200);
  const propertyList = searchData.data || searchData.properties || [];
  assert.ok(propertyList.some((p) => p._id === createdPropertyId));

  // Inspect Property Details
  const detailRes = await fetch(`${baseUrl}/api/properties/${createdPropertyId}`);
  const detailData = await detailRes.json();
  assert.equal(detailRes.status, 200);
  assert.equal(detailData.property.name, `E2E Heritage Retreat ${timestamp}`);

  // Fetch Rooms for this property
  const roomsRes = await fetch(`${baseUrl}/api/properties/${createdPropertyId}/rooms`);
  const roomsData = await roomsRes.json();
  assert.equal(roomsRes.status, 200);
  assert.equal(roomsData.rooms.length, 1);
  assert.equal(roomsData.rooms[0]._id, createdRoomId);

  // Check Availability
  const availRes = await fetch(
    `${baseUrl}/api/bookings/rooms/${createdRoomId}/availability?checkInDate=2027-06-01&checkOutDate=2027-06-04`
  );
  const availData = await availRes.json();
  assert.equal(availRes.status, 200);
  assert.equal(availData.available, true);
});

test('E2E Guest: Rejection of Invalid Booking Parameters', async () => {
  // 1. Past Date
  const pastRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guestToken}`,
    },
    body: JSON.stringify({
      roomId: createdRoomId,
      checkInDate: '2021-01-01',
      checkOutDate: '2021-01-04',
      guestsCount: 2,
    }),
  });
  assert.equal(pastRes.status, 400);

  // 2. CheckOut <= CheckIn
  const dateRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guestToken}`,
    },
    body: JSON.stringify({
      roomId: createdRoomId,
      checkInDate: '2027-06-05',
      checkOutDate: '2027-06-02',
      guestsCount: 2,
    }),
  });
  assert.equal(dateRes.status, 400);

  // 3. Capacity Violation (Capacity is 3, requesting 10)
  const capRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guestToken}`,
    },
    body: JSON.stringify({
      roomId: createdRoomId,
      checkInDate: '2027-06-01',
      checkOutDate: '2027-06-04',
      guestsCount: 10,
    }),
  });
  assert.equal(capRes.status, 400);
});

test('E2E Guest: Valid Booking Confirmation with Server Financials & DB Slots', async () => {
  // Stay: 2027-06-01 to 2027-06-04 (3 nights @ 5000/night = 15000 subtotal, 1800 taxes (12%), 16800 total)
  const bookRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guestToken}`,
    },
    body: JSON.stringify({
      roomId: createdRoomId,
      checkInDate: '2027-06-01',
      checkOutDate: '2027-06-04',
      guestsCount: 2,
    }),
  });

  const bookData = await bookRes.json();
  assert.equal(bookRes.status, 201);
  assert.equal(bookData.success, true);
  assert.equal(bookData.booking.nights, 3);
  assert.equal(bookData.booking.pricePerNight, 5000);
  assert.equal(bookData.booking.subtotal, 15000);
  assert.equal(bookData.booking.taxes, 1800);
  assert.equal(bookData.booking.totalPrice, 16800);
  assert.equal(bookData.booking.status, 'CONFIRMED');
  assert.equal(bookData.pricingDetails.settlementStatus, 'UNPAID_DEMO_RESERVATION');

  createdBookingId = bookData.booking._id;

  // Confirm database reservation slots are present in MongoDB
  const slots = await RoomReservationSlot.find({ booking: createdBookingId }).sort({ dateString: 1 });
  assert.equal(slots.length, 3);
  assert.equal(slots[0].dateString, '2027-06-01');
  assert.equal(slots[1].dateString, '2027-06-02');
  assert.equal(slots[2].dateString, '2027-06-03');
  assert.ok(slots.every((s) => s.status === 'CONFIRMED' && s.expiresAt === null));
});

test('E2E Concurrency: Guest 2 Overlapping Booking Rejected (409 Conflict)', async () => {
  // Overlapping by 1 night (2027-06-03 to 2027-06-06)
  const conflictRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guest2Token}`,
    },
    body: JSON.stringify({
      roomId: createdRoomId,
      checkInDate: '2027-06-03',
      checkOutDate: '2027-06-06',
      guestsCount: 1,
    }),
  });

  assert.equal(conflictRes.status, 409);
  const conflictData = await conflictRes.json();
  assert.match(conflictData.message, /already reserved/i);
});

test('E2E Guest: Cancellation Releases Reservation Slots, Dates Available for Rebooking', async () => {
  // Guest 1 cancels
  const cancelRes = await fetch(`${baseUrl}/api/bookings/${createdBookingId}/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guestToken}`,
    },
    body: JSON.stringify({ reason: 'Trip rescheduled' }),
  });

  const cancelData = await cancelRes.json();
  assert.equal(cancelRes.status, 200);
  assert.equal(cancelData.booking.status, 'CANCELLED');

  // Verify reservation slots were completely deleted
  const remainingSlots = await RoomReservationSlot.find({ booking: createdBookingId });
  assert.equal(remainingSlots.length, 0);

  // Guest 2 now successfully books those exact dates
  const rebookRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guest2Token}`,
    },
    body: JSON.stringify({
      roomId: createdRoomId,
      checkInDate: '2027-06-01',
      checkOutDate: '2027-06-04',
      guestsCount: 2,
    }),
  });

  const rebookData = await rebookRes.json();
  assert.equal(rebookRes.status, 201);
  assert.equal(rebookData.booking.status, 'CONFIRMED');
  createdBookingId = rebookData.booking._id; // Updated to active booking
});

// ==========================================
// 4. OWNER WORKFLOW & MULTI-TENANT ISOLATION
// ==========================================

test('E2E Owner: Review Bookings with Guest Contact Info & Verify Owner Analytics', async () => {
  // Owner 1 retrieves bookings for their property
  const ownerBookingsRes = await fetch(`${baseUrl}/api/bookings/owner/my-bookings`, {
    headers: { Authorization: `Bearer ${owner1Token}` },
  });

  const ownerBookingsData = await ownerBookingsRes.json();
  assert.equal(ownerBookingsRes.status, 200);
  assert.ok(ownerBookingsData.bookings.some((b) => b._id === createdBookingId));

  const booking = ownerBookingsData.bookings.find((b) => b._id === createdBookingId);
  // Legitimate owner sees guest contact info for arrival coordination
  assert.equal(booking.guest.name, 'Second Traveler');
  assert.equal(booking.guest.email, guest2Email);

  // Owner Analytics
  const analyticsRes = await fetch(`${baseUrl}/api/bookings/owner/analytics`, {
    headers: { Authorization: `Bearer ${owner1Token}` },
  });

  const analyticsData = await analyticsRes.json();
  assert.equal(analyticsRes.status, 200);
  assert.equal(analyticsData.analytics.propertiesCount, 1);
  assert.equal(analyticsData.analytics.roomsCount, 1);
  assert.equal(analyticsData.analytics.activeBookings, 1);
  assert.equal(analyticsData.analytics.totalRevenue, 16800);
  assert.ok(analyticsData.analytics.settlementNotice);
});

test('E2E Multi-Tenant Isolation: Owner 2 Cannot Access Owner 1 Properties, Rooms, or Analytics', async () => {
  // Register Owner 2
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rival Hotelier',
      email: owner2Email,
      password: 'Password123#',
      role: 'PROPERTY_OWNER',
      phone: '+91 96666 77777',
    }),
  });
  const regData = await regRes.json();
  owner2User = regData.user;
  owner2Token = regData.token;

  // 1. Owner 2 attempts to update Owner 1 property -> 403
  const propRes = await fetch(`${baseUrl}/api/properties/${createdPropertyId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner2Token}`,
    },
    body: JSON.stringify({ name: 'Hacked Property Name' }),
  });
  assert.equal(propRes.status, 403);

  // 2. Owner 2 attempts to add room to Owner 1 property -> 403
  const addRoomRes = await fetch(`${baseUrl}/api/properties/${createdPropertyId}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner2Token}`,
    },
    body: JSON.stringify({
      roomType: 'Unauthorized Room',
      pricePerNight: 1000,
      capacity: 1,
      bedType: 'Single Bed',
    }),
  });
  assert.equal(addRoomRes.status, 403);

  // 3. Owner 2 attempts to update Owner 1 room -> 403
  const roomRes = await fetch(`${baseUrl}/api/rooms/${createdRoomId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner2Token}`,
    },
    body: JSON.stringify({ pricePerNight: 99999 }),
  });
  assert.equal(roomRes.status, 403);

  // 4. Owner 2 queries bookings -> zero bookings returned
  const bookingsRes = await fetch(`${baseUrl}/api/bookings/owner/my-bookings`, {
    headers: { Authorization: `Bearer ${owner2Token}` },
  });
  const bookingsData = await bookingsRes.json();
  assert.equal(bookingsRes.status, 200);
  assert.equal(bookingsData.count, 0);

  // 5. Owner 2 queries analytics -> 0 count, 0 revenue
  const analyticsRes = await fetch(`${baseUrl}/api/bookings/owner/analytics`, {
    headers: { Authorization: `Bearer ${owner2Token}` },
  });
  const analyticsData = await analyticsRes.json();
  assert.equal(analyticsRes.status, 200);
  assert.equal(analyticsData.analytics.propertiesCount, 0);
  assert.equal(analyticsData.analytics.roomsCount, 0);
  assert.equal(analyticsData.analytics.activeBookings, 0);
  assert.equal(analyticsData.analytics.totalRevenue, 0);
});

// ==========================================
// 5. PLATFORM ADMIN & PRIVACY FIREWALL
// ==========================================

test('E2E Platform Admin: Overview Aggregates and Privacy Firewall Enforced', async () => {
  // 1. Overview metrics
  const overviewRes = await fetch(`${baseUrl}/api/admin/overview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const overviewData = await overviewRes.json();
  assert.equal(overviewRes.status, 200);
  assert.ok(overviewData.overview.users.total >= 4);
  assert.ok(overviewData.overview.properties.total >= 1);
  assert.ok(overviewData.overview.bookings.grossBookingVolume >= 16800);

  // 2. Admin cannot access individual guest booking details -> 403 Forbidden
  const privateBookingRes = await fetch(`${baseUrl}/api/bookings/${createdBookingId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(privateBookingRes.status, 403, 'Platform Admin must be denied individual booking record with 403');

  // 3. Users list suppresses guest private profile photo and phone number
  const usersRes = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const usersData = await usersRes.json();
  assert.equal(usersRes.status, 200);

  const guestRecord = usersData.users.find((u) => u.email === guestEmail);
  assert.ok(guestRecord);
  assert.equal(guestRecord.avatar, undefined, 'Guest avatar must be suppressed');
  assert.equal(guestRecord.phone, undefined, 'Guest phone number must be suppressed');
  assert.equal(guestRecord.password, undefined);
});

test('E2E Platform Admin: Account Moderation (Suspend / Reactivate)', async () => {
  // Suspend Guest 1
  const suspRes = await fetch(`${baseUrl}/api/admin/users/${guestUser._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'SUSPENDED' }),
  });
  assert.equal(suspRes.status, 200);

  // Suspended user attempting login -> 403
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: guestEmail, password: 'Password123#' }),
  });
  assert.equal(loginRes.status, 403);
  const loginData = await loginRes.json();
  assert.match(loginData.message, /suspended/i);

  // Reactivate user
  const reactRes = await fetch(`${baseUrl}/api/admin/users/${guestUser._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'ACTIVE' }),
  });
  assert.equal(reactRes.status, 200);
});

test('E2E Platform Admin: Property Moderation (Deactivate / Reactivate)', async () => {
  // Deactivate property
  const deactRes = await fetch(`${baseUrl}/api/admin/properties/${createdPropertyId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'INACTIVE' }),
  });
  assert.equal(deactRes.status, 200);

  // Public listing must NOT include inactive property
  const publicRes = await fetch(`${baseUrl}/api/properties?city=Manali`);
  const publicData = await publicRes.json();
  const publicList = publicData.data || publicData.properties || [];
  assert.equal(publicList.some((p) => p._id === createdPropertyId), false);

  // Reactivate property
  const reactRes = await fetch(`${baseUrl}/api/admin/properties/${createdPropertyId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'ACTIVE' }),
  });
  assert.equal(reactRes.status, 200);

  // Public listing now includes property
  const publicAgainRes = await fetch(`${baseUrl}/api/properties?city=Manali`);
  const publicAgainData = await publicAgainRes.json();
  const publicAgainList = publicAgainData.data || publicAgainData.properties || [];
  assert.equal(publicAgainList.some((p) => p._id === createdPropertyId), true);
});

// ==========================================
// 6. SECURITY, SPOOFING & PERSISTENCE
// ==========================================

test('E2E Security: Unauthenticated and Tampered Requests are Rejected', async () => {
  // Missing token
  const noTokenRes = await fetch(`${baseUrl}/api/bookings/my-bookings`);
  assert.equal(noTokenRes.status, 401);

  // Tampered token
  const badTokenRes = await fetch(`${baseUrl}/api/bookings/my-bookings`, {
    headers: { Authorization: 'Bearer thisiscompletelyfakeandbadtoken12345' },
  });
  assert.equal(badTokenRes.status, 401);

  // Non-existent route
  const notFoundRes = await fetch(`${baseUrl}/api/some-undefined-endpoint-xyz`);
  assert.equal(notFoundRes.status, 404);
});

test('E2E Security: Client cannot elevate role by spoofing request body', async () => {
  // Guest attempts to escalate to PLATFORM_ADMIN via profile update
  const spoofRes = await fetch(`${baseUrl}/api/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guestToken}`,
    },
    body: JSON.stringify({ role: 'PLATFORM_ADMIN' }),
  });

  const spoofData = await spoofRes.json();
  assert.equal(spoofRes.status, 200);
  assert.equal(spoofData.user.role, 'GUEST', 'Role elevation in profile update must be ignored');
});

test('E2E Persistence: Data persists cleanly in MongoDB across simulated connection cycle', async () => {
  // Disconnect and reconnect Mongoose
  await mongoose.disconnect();
  await connectDB();

  // Re-verify that booking and reservation slots remain intact in MongoDB
  const booking = await Booking.findById(createdBookingId);
  assert.ok(booking, 'Booking must persist in MongoDB after connection cycle');
  assert.equal(booking.status, 'CONFIRMED');

  const slots = await RoomReservationSlot.find({ booking: createdBookingId });
  assert.equal(slots.length, 3, 'Reservation slots must persist in MongoDB');
  assert.ok(slots.every((s) => s.status === 'CONFIRMED'));
});
