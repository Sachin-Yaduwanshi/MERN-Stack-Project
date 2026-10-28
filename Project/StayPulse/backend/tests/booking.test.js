import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Property from '../src/models/Property.js';
import Room from '../src/models/Room.js';
import Booking from '../src/models/Booking.js';
import RoomReservationSlot from '../src/models/RoomReservationSlot.js';
import { connectDB } from '../src/config/db.js';
import { generateToken } from '../src/utils/token.js';
import { UPLOADS_ROOT } from '../src/utils/fileUpload.js';
import { cleanupExpiredReservationSlots } from '../src/controllers/bookingController.js';

let server;
let baseUrl;

const timestamp = Date.now();
const owner1Email = `book_owner1_${timestamp}@staypulse.test`;
const owner2Email = `book_owner2_${timestamp}@staypulse.test`;
const guest1Email = `book_guest1_${timestamp}@staypulse.test`;
const guest2Email = `book_guest2_${timestamp}@staypulse.test`;
const adminEmail = `book_admin_${timestamp}@staypulse.test`;

let owner1User, owner2User, guest1User, guest2User, adminUser;
let owner1Token, owner2Token, guest1Token, guest2Token, adminToken;
let testProperty, testRoom, testRoom2;
let createdBookingId;
let activeConfirmedBookingId;

const guestAvatarFilename = `guest_test_${timestamp}.jpg`;
const owner2AvatarFilename = `owner2_test_${timestamp}.jpg`;

before(async () => {
  await connectDB();

  // Create Users
  owner1User = await User.create({
    name: 'Hotelier Owner 1',
    email: owner1Email,
    password: 'Password123#',
    role: 'PROPERTY_OWNER',
    phone: '+91 99001 11222',
  });
  owner1Token = generateToken(owner1User._id, owner1User.role);

  owner2User = await User.create({
    name: 'Hotelier Owner 2',
    email: owner2Email,
    password: 'Password123#',
    role: 'PROPERTY_OWNER',
    phone: '+91 99002 22333',
    avatar: `/uploads/profiles/${owner2AvatarFilename}`,
    ownerAvatarVisible: false, // Strict test: Avatar hidden from public and admin view
  });
  owner2Token = generateToken(owner2User._id, owner2User.role);

  guest1User = await User.create({
    name: 'Traveler Guest 1',
    email: guest1Email,
    password: 'Password123#',
    role: 'GUEST',
    phone: '+91 98765 00001',
    avatar: `/uploads/profiles/${guestAvatarFilename}`,
  });
  guest1Token = generateToken(guest1User._id, guest1User.role);

  guest2User = await User.create({
    name: 'Traveler Guest 2',
    email: guest2Email,
    password: 'Password123#',
    role: 'GUEST',
    phone: '+91 98765 00002',
  });
  guest2Token = generateToken(guest2User._id, guest2User.role);

  adminUser = await User.create({
    name: 'Super Admin',
    email: adminEmail,
    password: 'Password123#',
    role: 'PLATFORM_ADMIN',
  });
  adminToken = generateToken(adminUser._id, adminUser.role);

  // Create Property for Owner 1
  testProperty = await Property.create({
    owner: owner1User._id,
    name: 'Amber Fort View Suites',
    description: 'Boutique stay overlooking historic Amber Fort.',
    location: {
      address: '10 Amber Road',
      city: 'Jaipur',
      state: 'Rajasthan',
      country: 'India',
    },
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    startingPrice: 3000,
    status: 'ACTIVE',
  });

  // Create Rooms under Property
  testRoom = await Room.create({
    property: testProperty._id,
    roomType: 'Royal Heritage Suite',
    capacity: 2,
    bedType: '1 King Bed',
    pricePerNight: 3000,
    status: 'AVAILABLE',
  });

  testRoom2 = await Room.create({
    property: testProperty._id,
    roomType: 'Deluxe Courtyard Room',
    capacity: 3,
    bedType: '2 Queen Beds',
    pricePerNight: 4000,
    status: 'AVAILABLE',
  });

  // Create test profile image files on disk to verify profile photo privacy firewall
  const profilesDir = path.join(UPLOADS_ROOT, 'profiles');
  if (!fs.existsSync(profilesDir)) {
    fs.mkdirSync(profilesDir, { recursive: true });
  }
  const dummyJpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  fs.writeFileSync(path.join(profilesDir, guestAvatarFilename), dummyJpg);
  fs.writeFileSync(path.join(profilesDir, owner2AvatarFilename), dummyJpg);

  // Start test server
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

  // Cleanup test image files
  try {
    const p1 = path.join(UPLOADS_ROOT, 'profiles', guestAvatarFilename);
    const p2 = path.join(UPLOADS_ROOT, 'profiles', owner2AvatarFilename);
    if (fs.existsSync(p1)) fs.unlinkSync(p1);
    if (fs.existsSync(p2)) fs.unlinkSync(p2);
  } catch (e) {
    // ignore
  }

  // Cleanup DB
  await RoomReservationSlot.deleteMany({
    room: { $in: [testRoom._id, testRoom2._id] },
  });
  await Booking.deleteMany({
    guest: { $in: [guest1User._id, guest2User._id] },
  });
  await Room.deleteMany({ property: testProperty._id });
  await Property.deleteMany({ owner: { $in: [owner1User._id, owner2User._id] } });
  await User.deleteMany({
    _id: { $in: [owner1User._id, owner2User._id, guest1User._id, guest2User._id, adminUser._id] },
  });

  await mongoose.disconnect();
});

test('1. Valid Booking Creation & Server Financial Calculations by GUEST', async () => {
  // Stay: 2026-11-10 to 2026-11-13 (3 nights @ 3000/night = 9000 subtotal, 1080 taxes (12%), 10080 total)
  const res = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guest1Token}`,
    },
    body: JSON.stringify({
      roomId: testRoom._id.toString(),
      checkInDate: '2026-11-10',
      checkOutDate: '2026-11-13',
      guestsCount: 2,
    }),
  });

  const data = await res.json();
  assert.equal(res.status, 201, `Expected 201 Created: ${data.message}`);
  assert.equal(data.success, true);
  assert.ok(data.booking.bookingReference.startsWith('SP-'));
  assert.equal(data.booking.nights, 3);
  assert.equal(data.booking.pricePerNight, 3000);
  assert.equal(data.booking.subtotal, 9000);
  assert.equal(data.booking.taxes, 1080); // 12% of 9000
  assert.equal(data.booking.totalPrice, 10080);
  assert.equal(data.booking.status, 'CONFIRMED');
  assert.equal(data.pricingDetails.gstRatePercentage, '12%');
  assert.equal(data.pricingDetails.settlementStatus, 'UNPAID_DEMO_RESERVATION');

  createdBookingId = data.booking._id;

  // Verify database reservation slots were created for all 3 nights
  const slots = await RoomReservationSlot.find({ booking: data.booking._id }).sort({ dateString: 1 });
  assert.equal(slots.length, 3);
  assert.equal(slots[0].dateString, '2026-11-10');
  assert.equal(slots[1].dateString, '2026-11-11');
  assert.equal(slots[2].dateString, '2026-11-12');
});

test('2. Rejection of Past Check-in Date', async () => {
  const res = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guest1Token}`,
    },
    body: JSON.stringify({
      roomId: testRoom2._id.toString(),
      checkInDate: '2020-01-01',
      checkOutDate: '2020-01-05',
      guestsCount: 2,
    }),
  });

  const data = await res.json();
  assert.equal(res.status, 400, 'Past check-in date must be rejected with 400');
  assert.match(data.message, /past/i);
});

test('3. Rejection of Invalid Date Range (checkOut <= checkIn)', async () => {
  const res = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guest1Token}`,
    },
    body: JSON.stringify({
      roomId: testRoom2._id.toString(),
      checkInDate: '2026-12-10',
      checkOutDate: '2026-12-08',
      guestsCount: 1,
    }),
  });

  const data = await res.json();
  assert.equal(res.status, 400, 'Invalid check-out date must be rejected with 400');
  assert.match(data.message, /check-out date must be strictly after check-in/i);
});

test('4. Rejection of Room Capacity Violation', async () => {
  // testRoom capacity is 2, requesting 4 guests
  const res = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guest2Token}`,
    },
    body: JSON.stringify({
      roomId: testRoom._id.toString(),
      checkInDate: '2026-12-01',
      checkOutDate: '2026-12-05',
      guestsCount: 4,
    }),
  });

  const data = await res.json();
  assert.equal(res.status, 400, 'Exceeding room capacity must return 400 Bad Request');
  assert.match(data.message, /capacity/i);
});

test('5. Rejection of Overlapping Reservation (409 Conflict)', async () => {
  // testRoom already has booking: 2026-11-10 to 2026-11-13
  // Attempting overlapping stay: 2026-11-12 to 2026-11-15
  const res = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guest2Token}`,
    },
    body: JSON.stringify({
      roomId: testRoom._id.toString(),
      checkInDate: '2026-11-12',
      checkOutDate: '2026-11-15',
      guestsCount: 2,
    }),
  });

  const data = await res.json();
  assert.equal(res.status, 409, 'Overlapping booking must return 409 Conflict');
  assert.match(data.message, /already reserved/i);
});

test('6. Database-Backed Atomic Concurrency: Simultaneous Overlapping Race Condition Resolved Cleanly', async () => {
  // Target: testRoom2 (2026-12-20 to 2026-12-25)
  // Two guests attempt to confirm the same room simultaneously.
  // The database-enforced unique index on RoomReservationSlot ensures atomic exclusivity.
  const bookingPayload = {
    roomId: testRoom2._id.toString(),
    checkInDate: '2026-12-20',
    checkOutDate: '2026-12-25',
    guestsCount: 2,
  };

  const [res1, res2] = await Promise.all([
    fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guest1Token}`,
      },
      body: JSON.stringify(bookingPayload),
    }),
    fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guest2Token}`,
      },
      body: JSON.stringify(bookingPayload),
    }),
  ]);

  const statuses = [res1.status, res2.status].sort();
  // Exactly one must succeed (201) and the second must be rejected with conflict (409)
  assert.deepEqual(statuses, [201, 409], 'Simultaneous booking must yield exactly one 201 and one 409');
});

test('7. Database Engine Direct Unique Constraint Verification', async () => {
  // 1. Confirm that the unique compound index actually exists in the configured MongoDB catalog
  const indexes = await RoomReservationSlot.collection.indexes();
  const hasUniqueCompound = indexes.some(
    (idx) => idx.key.room === 1 && idx.key.dateString === 1 && idx.unique === true
  );
  assert.strictEqual(
    hasUniqueCompound,
    true,
    'Unique compound index {room: 1, dateString: 1} must exist in MongoDB index catalog'
  );

  // 2. Directly verify MongoDB WiredTiger unique index enforcement:
  // Attempting duplicate insert on RoomReservationSlot throws E11000 duplicate key error
  const duplicateSlot = {
    room: testRoom._id,
    dateString: '2026-11-10', // Already reserved by test 1
  };

  let threwDuplicateError = false;
  try {
    await RoomReservationSlot.create(duplicateSlot);
  } catch (err) {
    if (err.code === 11000) {
      threwDuplicateError = true;
    }
  }

  assert.equal(threwDuplicateError, true, 'MongoDB engine must enforce unique compound index {room: 1, dateString: 1}');
});

test('8. Back-to-Back Reservation Success (checkIn === previous.checkOut)', async () => {
  // testRoom has booking: 2026-11-10 to 2026-11-13 (nights: 10, 11, 12)
  // New booking: check-in on 2026-11-13 to 2026-11-16 (nights: 13, 14, 15 - back-to-back stay)
  const res = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guest2Token}`,
    },
    body: JSON.stringify({
      roomId: testRoom._id.toString(),
      checkInDate: '2026-11-13',
      checkOutDate: '2026-11-16',
      guestsCount: 1,
    }),
  });

  const data = await res.json();
  assert.equal(res.status, 201, `Back-to-back booking must succeed: ${data.message}`);
  assert.equal(data.success, true);
});

test('9. Guest Cancellation Releases Database Slots for Re-Booking', async () => {
  // Cancel createdBookingId (2026-11-10 to 2026-11-13)
  const cancelRes = await fetch(`${baseUrl}/api/bookings/${createdBookingId}/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guest1Token}`,
    },
    body: JSON.stringify({ reason: 'Trip rescheduled' }),
  });

  const cancelData = await cancelRes.json();
  assert.equal(cancelRes.status, 200, `Cancellation must return 200: ${cancelData.message}`);
  assert.equal(cancelData.booking.status, 'CANCELLED');
  assert.ok(cancelData.booking.cancelledAt);

  // Assert database reservation slots were deleted
  const remainingSlots = await RoomReservationSlot.find({ booking: createdBookingId });
  assert.equal(remainingSlots.length, 0, 'Cancelled booking reservation slots must be deleted from DB');

  // Now, Guest 2 should be able to book the exact previously cancelled dates!
  const rebookRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guest2Token}`,
    },
    body: JSON.stringify({
      roomId: testRoom._id.toString(),
      checkInDate: '2026-11-10',
      checkOutDate: '2026-11-13',
      guestsCount: 2,
    }),
  });

  const rebookData = await rebookRes.json();
  assert.equal(rebookRes.status, 201, 'Rebooking released dates after cancellation must succeed');
  assert.equal(rebookData.booking.status, 'CONFIRMED');
  activeConfirmedBookingId = rebookData.booking._id;
});

test('10. Lifecycle State Machine: Rejection of Modifying a CANCELLED Booking', async () => {
  // Attempting to change status of cancelled booking returns 400 Bad Request
  const res = await fetch(`${baseUrl}/api/bookings/owner/${createdBookingId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner1Token}`,
    },
    body: JSON.stringify({ status: 'CONFIRMED' }),
  });

  const data = await res.json();
  assert.equal(res.status, 400, 'Cannot update a cancelled booking');
  assert.match(data.message, /cancelled reservation cannot be updated/i);
});

test('11. Lifecycle State Machine: Rejection of Marking Future Stay as COMPLETED', async () => {
  // Create an active future stay booking
  const futureRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guest1Token}`,
    },
    body: JSON.stringify({
      roomId: testRoom._id.toString(),
      checkInDate: '2026-11-20',
      checkOutDate: '2026-11-25',
      guestsCount: 1,
    }),
  });
  const futureData = await futureRes.json();
  assert.equal(futureRes.status, 201);

  // Owner attempts to mark future stay as COMPLETED before checkout: MUST BE REJECTED
  const completeRes = await fetch(`${baseUrl}/api/bookings/owner/${futureData.booking._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner1Token}`,
    },
    body: JSON.stringify({ status: 'COMPLETED' }),
  });

  const completeData = await completeRes.json();
  assert.equal(completeRes.status, 400, 'Future stay cannot be marked as COMPLETED before checkout');
  assert.match(completeData.message, /before the scheduled check-out date/i);
});

test('12. Guest Cannot Access Another Guest Booking Record (Privacy Isolation)', async () => {
  const res = await fetch(`${baseUrl}/api/bookings/${createdBookingId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${guest2Token}`,
    },
  });

  assert.equal(res.status, 403, 'Cross-guest booking inspection must be forbidden (403)');
});

test('13. Guest Cannot Cancel Another Guest Booking', async () => {
  const res = await fetch(`${baseUrl}/api/bookings/${createdBookingId}/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guest2Token}`,
    },
    body: JSON.stringify({ reason: 'Malicious attempt' }),
  });

  assert.equal(res.status, 403, 'Cross-guest cancellation must be forbidden (403)');
});

test('13b. Guest Bookings List (/api/bookings/my-bookings) Isolated & Populated with Hotel Details', async () => {
  // 1. Unauthenticated request rejected with 401
  const unauthRes = await fetch(`${baseUrl}/api/bookings/my-bookings`);
  assert.equal(unauthRes.status, 401, 'Unauthenticated request must return 401');

  // 2. Non-GUEST roles rejected with 403
  const ownerRes = await fetch(`${baseUrl}/api/bookings/my-bookings`, {
    headers: { Authorization: `Bearer ${owner1Token}` },
  });
  assert.equal(ownerRes.status, 403, 'Owner cannot access guest bookings endpoint');

  const adminRes = await fetch(`${baseUrl}/api/bookings/my-bookings`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(adminRes.status, 403, 'Admin cannot access guest bookings endpoint');

  // 3. Guest 1 retrieves their bookings
  const guest1Res = await fetch(`${baseUrl}/api/bookings/my-bookings`, {
    headers: { Authorization: `Bearer ${guest1Token}` },
  });
  const guest1Data = await guest1Res.json();
  assert.equal(guest1Res.status, 200);
  assert.equal(guest1Data.success, true);
  assert.ok(Array.isArray(guest1Data.bookings));
  assert.equal(guest1Data.count, guest1Data.bookings.length);
  // All returned bookings must belong exclusively to Guest 1
  for (const b of guest1Data.bookings) {
    assert.equal(b.guest.toString(), guest1User._id.toString());
    assert.ok(b.property?.name, 'Booking must have populated property name');
    assert.ok(b.room?.roomType, 'Booking must have populated roomType');
    assert.ok(typeof b.totalPrice === 'number', 'Booking must have numeric totalPrice');
    assert.ok(b.bookingReference, 'Booking must have bookingReference');
  }

  // 4. Guest 2 retrieves their bookings and does not see Guest 1's bookings
  const guest2Res = await fetch(`${baseUrl}/api/bookings/my-bookings`, {
    headers: { Authorization: `Bearer ${guest2Token}` },
  });
  const guest2Data = await guest2Res.json();
  assert.equal(guest2Res.status, 200);
  assert.equal(guest2Data.success, true);
  for (const b of guest2Data.bookings) {
    assert.equal(b.guest.toString(), guest2User._id.toString());
  }
});

test('14. Property Owner 1 Can View Bookings for Their Hotel with Guest Contact Info', async () => {
  const res = await fetch(`${baseUrl}/api/bookings/owner/my-bookings`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${owner1Token}`,
    },
  });

  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(data.bookings.length >= 1);
  const b = data.bookings[0];
  assert.ok(b.guest.name);
  assert.ok(b.guest.email);
});

test('15. Property Owner 2 Cannot Access or Modify Bookings of Property Owner 1', async () => {
  const listRes = await fetch(`${baseUrl}/api/bookings/owner/my-bookings`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${owner2Token}`,
    },
  });

  const listData = await listRes.json();
  assert.equal(listRes.status, 200);
  assert.equal(listData.bookings.length, 0, 'Owner 2 must not see Owner 1 bookings');

  const updateRes = await fetch(`${baseUrl}/api/bookings/owner/${createdBookingId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner2Token}`,
    },
    body: JSON.stringify({ status: 'CANCELLED' }),
  });

  assert.equal(updateRes.status, 403, 'Cross-owner booking mutation must be forbidden (403)');
});

test('16. Platform Admin Privacy Firewall: Individual Records Denied (403), Aggregates Allowed', async () => {
  // 1. Admin attempts to fetch individual guest booking: MUST BE FORBIDDEN
  const individualRes = await fetch(`${baseUrl}/api/bookings/${createdBookingId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  assert.equal(individualRes.status, 403, 'Admin must receive 403 Forbidden on individual guest booking records');

  // 2. Admin calls aggregate stats endpoint: MUST SUCCEED with counts only
  const statsRes = await fetch(`${baseUrl}/api/bookings/admin/stats`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  const statsData = await statsRes.json();
  assert.equal(statsRes.status, 200, 'Admin aggregate stats must succeed');
  assert.equal(statsData.success, true);
  assert.ok(typeof statsData.stats.totalBookings === 'number');
  assert.ok(typeof statsData.stats.estimatedGrossBookingValue === 'number');
  assert.ok(statsData.stats.settlementNotice);
  assert.equal(statsData.bookings, undefined, 'Admin stats response must NEVER leak booking records array');
});

test('17. Profile Photo Privacy Firewall: Platform Admin & Cross-Users Blocked from Guest Photos', async () => {
  // 1. Unauthenticated request to private guest profile photo is rejected (401)
  const unauthRes = await fetch(`${baseUrl}/api/uploads/profiles/${guestAvatarFilename}`);
  assert.equal(unauthRes.status, 401, 'Unauthenticated guest photo access must be 401');

  // 2. Platform Admin attempting to view guest profile photo is rejected (403)
  const adminRes = await fetch(`${baseUrl}/api/uploads/profiles/${guestAvatarFilename}`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  assert.equal(adminRes.status, 403, 'Platform Admin MUST be denied access to guest profile photo (403)');

  // 3. Another user (Guest 2) attempting to view Guest 1 profile photo is rejected (403)
  const crossUserRes = await fetch(`${baseUrl}/api/uploads/profiles/${guestAvatarFilename}`, {
    headers: {
      Authorization: `Bearer ${guest2Token}`,
    },
  });
  assert.equal(crossUserRes.status, 403, 'Cross-user access to guest profile photo must be denied (403)');

  // 4. Guest 1 themselves accessing their own profile photo succeeds (200)
  const ownerRes = await fetch(`${baseUrl}/api/uploads/profiles/${guestAvatarFilename}`, {
    headers: {
      Authorization: `Bearer ${guest1Token}`,
    },
  });
  assert.equal(ownerRes.status, 200, 'Guest accessing their own profile photo must succeed (200)');
});

test('18. Profile Photo Privacy: Hidden Property Owner Avatar Denied to Public/Admin', async () => {
  // Owner 2 has ownerAvatarVisible = false
  // 1. Unauthenticated request denied (403)
  const unauthRes = await fetch(`${baseUrl}/api/uploads/profiles/${owner2AvatarFilename}`);
  assert.equal(unauthRes.status, 403, 'Public request to hidden host avatar must be 403');

  // 2. Platform Admin denied (403)
  const adminRes = await fetch(`${baseUrl}/api/uploads/profiles/${owner2AvatarFilename}`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  assert.equal(adminRes.status, 403, 'Admin request to hidden host avatar must be 403');

  // 3. Owner 2 themselves can view their own avatar (200)
  const ownerRes = await fetch(`${baseUrl}/api/uploads/profiles/${owner2AvatarFilename}`, {
    headers: {
      Authorization: `Bearer ${owner2Token}`,
    },
  });
  assert.equal(ownerRes.status, 200, 'Owner can access their own avatar even when hidden from public (200)');
});

test('19. Cross-Process Concurrency: Child OS Process vs Main Process Conflict Handled Safely', async () => {
  // Spawns a completely separate OS child process to fire an overlapping booking
  // at the exact same instant as the main process, bypassing any shared memory heap.
  const targetRoomId = testRoom._id.toString();
  const checkIn = '2026-12-05';
  const checkOut = '2026-12-09';

  const childScript = `
    fetch('${baseUrl}/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ${guest2Token}',
      },
      body: JSON.stringify({
        roomId: '${targetRoomId}',
        checkInDate: '${checkIn}',
        checkOutDate: '${checkOut}',
        guestsCount: 1,
      }),
    }).then(async (r) => {
      process.stdout.write(String(r.status));
      process.exit(0);
    }).catch((err) => {
      process.stderr.write(err.message);
      process.exit(1);
    });
  `;

  // Start separate OS process
  const childProcessPromise = new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', childScript]);
    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (d) => (output += d.toString()));
    child.stderr.on('data', (d) => (errorOutput += d.toString()));
    child.on('close', (code) => {
      if (code === 0) {
        resolve(parseInt(output.trim(), 10));
      } else {
        reject(new Error(`Child process failed with code ${code}: ${errorOutput}`));
      }
    });
  });

  // Simultaneously fire from main process
  const mainProcessPromise = fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guest1Token}`,
    },
    body: JSON.stringify({
      roomId: targetRoomId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      guestsCount: 2,
    }),
  }).then((r) => r.status);

  const [childStatus, mainStatus] = await Promise.all([childProcessPromise, mainProcessPromise]);
  const statuses = [childStatus, mainStatus].sort();

  // Exactly one must succeed (201) and the other must be rejected (409 Conflict)
  assert.deepEqual(statuses, [201, 409], 'Multi-OS process conflict must yield exactly one 201 and one 409');

  // Verify final database state across processes:
  // 1. Exactly ONE booking document was created in MongoDB for this stay
  const dIn19 = new Date(checkIn);
  dIn19.setHours(0, 0, 0, 0);
  const dOut19 = new Date(checkOut);
  dOut19.setHours(0, 0, 0, 0);

  const bookingsForStay = await Booking.find({
    room: targetRoomId,
    checkInDate: dIn19,
    checkOutDate: dOut19,
  });
  assert.equal(bookingsForStay.length, 1, 'Exactly one booking document must exist in MongoDB');
  const winningBooking = bookingsForStay[0];
  assert.equal(winningBooking.status, 'CONFIRMED');

  // 2. Exactly 4 reservation slots exist in MongoDB (2026-12-05 to 2026-12-08)
  const staySlots = await RoomReservationSlot.find({
    room: targetRoomId,
    dateString: { $in: ['2026-12-05', '2026-12-06', '2026-12-07', '2026-12-08'] },
  });
  assert.equal(staySlots.length, 4, 'Exactly 4 reservation slots must exist in MongoDB');
  assert.ok(
    staySlots.every(
      (s) => s.booking.toString() === winningBooking._id.toString() && s.status === 'CONFIRMED'
    ),
    'All slots must belong to the winning booking with status CONFIRMED'
  );

  // 3. Confirm that pre-existing confirmed booking retains all of its slots
  const validActiveSlots = await RoomReservationSlot.find({ booking: activeConfirmedBookingId });
  assert.equal(validActiveSlots.length, 3, 'Pre-existing confirmed booking must retain all 3 of its confirmed slots');
});

test('20. Orphaned Reservation Recovery: Abandoned Leases Safely Purged and Reclaimed', async () => {
  // Simulate a previous server crash after slot insertion but before booking document creation:
  // Create an abandoned unconfirmed slot for testRoom2 with an expired lease
  const crashDate = '2026-12-15';
  await RoomReservationSlot.create({
    room: testRoom2._id,
    dateString: crashDate,
    booking: null,
    status: 'PENDING',
    lockToken: 'crashed-worker-token-xyz',
    expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
  });

  // Now, a new guest attempts to reserve a stay covering this exact date
  const res = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guest1Token}`,
    },
    body: JSON.stringify({
      roomId: testRoom2._id.toString(),
      checkInDate: '2026-12-15',
      checkOutDate: '2026-12-18',
      guestsCount: 2,
    }),
  });

  const data = await res.json();
  assert.equal(res.status, 201, `Expired abandoned slot must be automatically reclaimed: ${data.message}`);
  assert.equal(data.success, true);
  assert.equal(data.booking.status, 'CONFIRMED');

  // Verify that the new confirmed booking has active slots with status CONFIRMED and lockToken updated
  const newSlots = await RoomReservationSlot.find({ booking: data.booking._id });
  assert.equal(newSlots.length, 3);
  assert.ok(newSlots.every((s) => s.status === 'CONFIRMED'));
});

test('21. Race Condition: Guest Cancellation Racing with Simultaneous Booking Attempt', async () => {
  // First, create a confirmed booking for 2026-12-28 to 2026-12-30
  const initialRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guest1Token}`,
    },
    body: JSON.stringify({
      roomId: testRoom._id.toString(),
      checkInDate: '2026-12-28',
      checkOutDate: '2026-12-30',
      guestsCount: 1,
    }),
  });

  const initialData = await initialRes.json();
  assert.equal(initialRes.status, 201);
  const bookingToCancelId = initialData.booking._id;

  // Now race: Guest 1 cancels while Guest 2 simultaneously attempts to reserve those exact dates
  const cancelPromise = fetch(`${baseUrl}/api/bookings/${bookingToCancelId}/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guest1Token}`,
    },
    body: JSON.stringify({ reason: 'Schedule conflict' }),
  });

  const rebookPromise = fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guest2Token}`,
    },
    body: JSON.stringify({
      roomId: testRoom._id.toString(),
      checkInDate: '2026-12-28',
      checkOutDate: '2026-12-30',
      guestsCount: 2,
    }),
  });

  const [cancelRes, rebookRes] = await Promise.all([cancelPromise, rebookPromise]);
  const cancelData = await cancelRes.json();
  const rebookData = await rebookRes.json();

  assert.equal(cancelRes.status, 200, 'Cancellation must always succeed cleanly');
  assert.equal(cancelData.booking.status, 'CANCELLED');

  // Rebooking either succeeds immediately (201) or returns conflict (409) if it evaluated before cancellation finished
  assert.ok([201, 409].includes(rebookRes.status));

  let finalWinningBookingId;
  // If it was 409, a retry immediately following the cancellation MUST succeed
  if (rebookRes.status === 409) {
    const retryRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guest2Token}`,
      },
      body: JSON.stringify({
        roomId: testRoom._id.toString(),
        checkInDate: '2026-12-28',
        checkOutDate: '2026-12-30',
        guestsCount: 2,
      }),
    });
    assert.equal(retryRes.status, 201, 'Retrying released dates after cancellation must succeed');
    const retryData = await retryRes.json();
    finalWinningBookingId = retryData.booking._id;
  } else {
    finalWinningBookingId = rebookData.booking._id;
  }

  // Verify final database state for Case 3:
  // 1. Cancelled booking record has status CANCELLED and zero reservation slots
  const cancelledBookingDoc = await Booking.findById(bookingToCancelId);
  assert.equal(cancelledBookingDoc.status, 'CANCELLED');
  const cancelledSlots = await RoomReservationSlot.find({ booking: bookingToCancelId });
  assert.equal(cancelledSlots.length, 0, 'Cancelled booking must have zero remaining reservation slots');

  // 2. Winning booking record has status CONFIRMED and exactly 2 slots
  const newBookingDoc = await Booking.findById(finalWinningBookingId);
  assert.equal(newBookingDoc.status, 'CONFIRMED');
  const newSlots = await RoomReservationSlot.find({ booking: finalWinningBookingId });
  assert.equal(newSlots.length, 2, 'New booking must have exactly 2 confirmed reservation slots');
  assert.ok(
    newSlots.every(
      (s) => s.status === 'CONFIRMED' && s.booking.toString() === finalWinningBookingId.toString()
    )
  );

  // 3. Confirm that earlier valid bookings retain their slots without interference
  const validActiveSlots = await RoomReservationSlot.find({ booking: activeConfirmedBookingId });
  assert.equal(validActiveSlots.length, 3, 'Pre-existing confirmed booking must retain its 3 slots');
});

test('22. Failure Recovery & Retry: Retrying Failed Booking Does Not Create Ghost Slots', async () => {
  // Guest submits booking that fails validation (e.g. invalid guestsCount > capacity)
  const failRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guest1Token}`,
    },
    body: JSON.stringify({
      roomId: testRoom._id.toString(),
      checkInDate: '2027-01-10',
      checkOutDate: '2027-01-12',
      guestsCount: 20, // Exceeds capacity
    }),
  });

  assert.equal(failRes.status, 400);

  // Assert NO ghost reservation slots were left behind in MongoDB
  const ghostSlots = await RoomReservationSlot.find({
    room: testRoom._id,
    dateString: { $in: ['2027-01-10', '2027-01-11'] },
  });
  assert.equal(ghostSlots.length, 0, 'Validation failure must not leave ghost reservation slots');

  // Now retry with valid parameters: must succeed
  const retryRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guest1Token}`,
    },
    body: JSON.stringify({
      roomId: testRoom._id.toString(),
      checkInDate: '2027-01-10',
      checkOutDate: '2027-01-12',
      guestsCount: 2,
    }),
  });

  assert.equal(retryRes.status, 201);
  const retryData = await retryRes.json();
  assert.equal(retryData.booking.status, 'CONFIRMED');

  // Verify database state for Case 5:
  // 1. Exactly ONE booking exists in MongoDB for this guest and date range (no duplicate bookings)
  const dIn22 = new Date('2027-01-10');
  dIn22.setHours(0, 0, 0, 0);
  const dOut22 = new Date('2027-01-12');
  dOut22.setHours(0, 0, 0, 0);

  const retriedBookings = await Booking.find({
    room: testRoom._id,
    checkInDate: dIn22,
    checkOutDate: dOut22,
  });
  assert.equal(retriedBookings.length, 1, 'Exactly one booking document must exist; no duplicate bookings');

  // 2. Exactly 2 reservation slots exist, both confirmed under the retried booking
  const retrySlots = await RoomReservationSlot.find({ booking: retryData.booking._id });
  assert.equal(retrySlots.length, 2, 'Retried booking must have exactly 2 confirmed reservation slots');
  assert.ok(retrySlots.every((s) => s.status === 'CONFIRMED'));

  // 3. Earlier valid bookings retain their slots
  const validSlotsAfterRetry = await RoomReservationSlot.find({ booking: activeConfirmedBookingId });
  assert.equal(validSlotsAfterRetry.length, 3, 'Pre-existing confirmed booking must retain all its slots');
});

test('23. Lease Expiration During In-Flight Booking: Cleanup Runs and Compensating Rollback Prevents Ghost Booking', async () => {
  const targetRoom = testRoom2;
  const checkIn = '2027-02-01';
  const checkOut = '2027-02-04'; // 3 nights

  const originalSave = Booking.prototype.save;
  let intercepted = false;

  try {
    Booking.prototype.save = async function (...args) {
      if (this.room.toString() === targetRoom._id.toString() && !intercepted) {
        intercepted = true;
        // 1. Slots were inserted by createBooking with status: 'PENDING' and lockToken
        // Simulate that this request hung and exceeded its 60-second lease:
        await RoomReservationSlot.updateMany(
          { room: targetRoom._id, dateString: { $in: ['2027-02-01', '2027-02-02', '2027-02-03'] } },
          { $set: { expiresAt: new Date(Date.now() - 1000) } }
        );

        // 2. Active cleanup runs while this request is stalled
        await cleanupExpiredReservationSlots();

        // Verify that cleanup purged the pending slots since their lease expired
        const pendingSlots = await RoomReservationSlot.find({
          room: targetRoom._id,
          dateString: { $in: ['2027-02-01', '2027-02-02', '2027-02-03'] },
        });
        assert.equal(pendingSlots.length, 0, 'Cleanup sweep must have purged expired unconfirmed slots');
      }
      return await originalSave.apply(this, args);
    };

    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guest1Token}`,
      },
      body: JSON.stringify({
        roomId: targetRoom._id.toString(),
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guestsCount: 2,
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 409, 'Expired lease during in-flight confirmation must return 409 Conflict');
    assert.match(data.message, /timed out prior to confirmation/i);

    // Verify database state: Compensating rollback MUST have deleted the Booking document
    const dIn23 = new Date(checkIn);
    dIn23.setHours(0, 0, 0, 0);
    const orphanBooking = await Booking.findOne({
      room: targetRoom._id,
      checkInDate: dIn23,
    });
    assert.equal(orphanBooking, null, 'Compensating rollback must delete Booking record when slots cannot be confirmed');

    // Verify zero orphaned reservation slots exist
    const slots = await RoomReservationSlot.find({
      room: targetRoom._id,
      dateString: { $in: ['2027-02-01', '2027-02-02', '2027-02-03'] },
    });
    assert.equal(slots.length, 0, 'No orphaned reservation slots should remain in MongoDB');

    // Confirm that other valid reservations retain their slots
    const validSlotsAfterTimeout = await RoomReservationSlot.find({ booking: activeConfirmedBookingId });
    assert.equal(validSlotsAfterTimeout.length, 3, 'Pre-existing confirmed booking must retain all its slots');

    // Verify that the guest can now cleanly retry and succeed
    const retryRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guest1Token}`,
      },
      body: JSON.stringify({
        roomId: targetRoom._id.toString(),
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guestsCount: 2,
      }),
    });
    const retryData = await retryRes.json();
    assert.equal(retryRes.status, 201, 'Retrying booking after timeout must succeed');
    assert.equal(retryData.booking.status, 'CONFIRMED');

    // Verify retried booking slots
    const retriedSlots = await RoomReservationSlot.find({ booking: retryData.booking._id });
    assert.equal(retriedSlots.length, 3);
    assert.ok(retriedSlots.every((s) => s.status === 'CONFIRMED'));
  } finally {
    Booking.prototype.save = originalSave;
  }
});

test('24. Injected Partial Slot Failure: matchedCount !== nights Triggers Compensating Rollback', async () => {
  const targetRoom = testRoom2;
  const checkIn = '2027-03-01';
  const checkOut = '2027-03-04'; // 3 nights: 2027-03-01, 2027-03-02, 2027-03-03

  const originalSave = Booking.prototype.save;
  let intercepted = false;

  try {
    Booking.prototype.save = async function (...args) {
      if (this.room.toString() === targetRoom._id.toString() && !intercepted) {
        intercepted = true;
        // Inject failure: Delete exactly 1 slot out of the 3 nights
        await RoomReservationSlot.deleteOne({
          room: targetRoom._id,
          dateString: '2027-03-02',
        });
      }
      return await originalSave.apply(this, args);
    };

    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guest1Token}`,
      },
      body: JSON.stringify({
        roomId: targetRoom._id.toString(),
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guestsCount: 2,
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 409, 'Partial slot confirmation must fail with 409 Conflict');
    assert.match(data.message, /timed out prior to confirmation/i);

    // Verify database state: Compensating rollback MUST delete the Booking document
    const dIn24 = new Date(checkIn);
    dIn24.setHours(0, 0, 0, 0);
    const orphanBooking = await Booking.findOne({
      room: targetRoom._id,
      checkInDate: dIn24,
    });
    assert.equal(orphanBooking, null, 'Booking document must be deleted if not all nights are confirmed');

    // Verify database state: The remaining 2 slots must also be rolled back by lockToken
    const remainingSlots = await RoomReservationSlot.find({
      room: targetRoom._id,
      dateString: { $in: ['2027-03-01', '2027-03-02', '2027-03-03'] },
    });
    assert.equal(remainingSlots.length, 0, 'No partial or dangling slots should remain');

    // Confirm that other valid reservations retain their slots
    const validSlotsAfterPartial = await RoomReservationSlot.find({ booking: activeConfirmedBookingId });
    assert.equal(validSlotsAfterPartial.length, 3, 'Pre-existing confirmed booking must retain all its slots');
  } finally {
    Booking.prototype.save = originalSave;
  }
});
