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
const ownerEmail = `approval_owner_${timestamp}@staypulse.test`;
const adminEmail = `approval_admin_${timestamp}@staypulse.test`;
const guestEmail = `approval_guest_${timestamp}@staypulse.test`;

let ownerUser, adminUser, guestUser;
let ownerToken, adminToken, guestToken;
let testPropertyId, testRoomId;

before(async () => {
  await connectDB();

  // Create Users
  adminUser = await User.create({
    name: 'Approval Admin',
    email: adminEmail,
    password: 'Password123#',
    role: 'PLATFORM_ADMIN',
  });
  adminToken = generateToken(adminUser._id, adminUser.role);

  ownerUser = await User.create({
    name: 'Approval Host',
    email: ownerEmail,
    password: 'Password123#',
    role: 'PROPERTY_OWNER',
  });
  ownerToken = generateToken(ownerUser._id, ownerUser.role);

  guestUser = await User.create({
    name: 'Approval Guest',
    email: guestEmail,
    password: 'Password123#',
    role: 'GUEST',
  });
  guestToken = generateToken(guestUser._id, guestUser.role);

  // Start HTTP server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (testRoomId) {
    await RoomReservationSlot.deleteMany({ room: testRoomId });
    await Booking.deleteMany({ room: testRoomId });
    await Room.deleteMany({ _id: testRoomId });
  }
  if (testPropertyId) {
    await Property.deleteMany({ _id: testPropertyId });
  }
  await User.deleteMany({
    email: { $in: [ownerEmail, adminEmail, guestEmail] },
  });

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.disconnect();
});

// =========================================================================
// 1. SUBMISSION & OWNER SELF-APPROVAL REJECTION
// =========================================================================

test('1. Owner submitting property defaults to PENDING_APPROVAL even if client passes status: ACTIVE', async () => {
  const res = await fetch(`${baseUrl}/api/properties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      name: 'Approval Test Heritage Palace',
      tagline: 'Stunning palace hotel',
      description: 'A newly submitted hotel awaiting administrator approval.',
      location: {
        address: '1 Heritage Way',
        city: 'Jaipur',
        state: 'Rajasthan',
      },
      startingPrice: 4000,
      coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945',
      status: 'ACTIVE', // Malicious or eager owner trying to self-activate!
    }),
  });

  const data = await res.json();
  assert.equal(res.status, 201);
  assert.equal(data.success, true);
  assert.equal(data.property.status, 'PENDING_APPROVAL', 'Must default to PENDING_APPROVAL and ignore client status');
  assert.equal(data.property.rejectionReason, '');

  testPropertyId = data.property._id;

  // Add room under this pending property for subsequent test checks
  const roomRes = await fetch(`${baseUrl}/api/properties/${testPropertyId}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      roomType: 'Maharaja Royal Suite',
      description: 'Spacious palace suite',
      capacity: 2,
      bedType: '1 King Bed',
      pricePerNight: 4000,
      amenities: ['AC', 'WiFi'],
    }),
  });

  const roomData = await roomRes.json();
  assert.equal(roomRes.status, 201);
  testRoomId = roomData.room._id;
});

test('2. Owner attempting to self-approve via PUT /api/properties/:id is rejected with 400', async () => {
  const res = await fetch(`${baseUrl}/api/properties/${testPropertyId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      status: 'ACTIVE',
    }),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.message, /cannot self-approve listings/i);

  // Verify DB state is still PENDING_APPROVAL
  const checkDb = await Property.findById(testPropertyId);
  assert.equal(checkDb.status, 'PENDING_APPROVAL');
});

// =========================================================================
// 2. PUBLIC INVISIBILITY & BOOKING PROTECTION FOR PENDING LISTINGS
// =========================================================================

test('3. Pending property is completely hidden from public search GET /api/properties', async () => {
  const res = await fetch(`${baseUrl}/api/properties?city=Jaipur`);
  const data = await res.json();

  assert.equal(res.status, 200);
  const properties = data.data || [];
  assert.ok(!properties.some((p) => p._id === testPropertyId), 'Pending property must not appear in public search');
});

test('4. Direct request GET /api/properties/:id for pending property returns 404', async () => {
  const res = await fetch(`${baseUrl}/api/properties/${testPropertyId}`);
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.success, false);
});

test('5. Direct request GET /api/properties/:id/rooms for pending property returns 404', async () => {
  const res = await fetch(`${baseUrl}/api/properties/${testPropertyId}/rooms`);
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.success, false);
});

test('6. Direct availability check for room under pending property returns 400', async () => {
  const res = await fetch(
    `${baseUrl}/api/bookings/rooms/${testRoomId}/availability?checkInDate=2027-08-01&checkOutDate=2027-08-03`
  );
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.message, /not currently active for reservations/i);
});

test('7. Direct booking creation for room under pending property returns 400', async () => {
  const res = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guestToken}`,
    },
    body: JSON.stringify({
      roomId: testRoomId,
      checkInDate: '2027-08-01',
      checkOutDate: '2027-08-03',
      guestsCount: 2,
    }),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.message, /not currently active for reservations/i);
});

// =========================================================================
// 3. ADMIN REVIEW & REJECTION WORKFLOW
// =========================================================================

test('8. Non-admin users (Guest & Owner) receive 403 Forbidden on admin status endpoint', async () => {
  const guestAttempt = await fetch(`${baseUrl}/api/admin/properties/${testPropertyId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guestToken}`,
    },
    body: JSON.stringify({ status: 'ACTIVE' }),
  });
  assert.equal(guestAttempt.status, 403);

  const ownerAttempt = await fetch(`${baseUrl}/api/admin/properties/${testPropertyId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({ status: 'ACTIVE' }),
  });
  assert.equal(ownerAttempt.status, 403);
});

test('9. Platform Admin can list pending applications via GET /api/admin/properties?status=PENDING_APPROVAL', async () => {
  const res = await fetch(`${baseUrl}/api/admin/properties?status=PENDING_APPROVAL`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.properties.some((p) => p._id === testPropertyId));
});

test('10. Platform Admin rejects property application with rejectionReason', async () => {
  const res = await fetch(`${baseUrl}/api/admin/properties/${testPropertyId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      status: 'REJECTED',
      rejectionReason: 'Incomplete property address and low resolution imagery.',
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.property.status, 'REJECTED');
  assert.equal(data.property.rejectionReason, 'Incomplete property address and low resolution imagery.');
  assert.ok(data.property.reviewedAt);
});

test('11. Rejected property remains completely hidden and non-bookable', async () => {
  // Public search -> hidden
  const searchRes = await fetch(`${baseUrl}/api/properties?city=Jaipur`);
  const searchData = await searchRes.json();
  assert.ok(!searchData.data.some((p) => p._id === testPropertyId));

  // Direct get by ID -> 404
  const getRes = await fetch(`${baseUrl}/api/properties/${testPropertyId}`);
  assert.equal(getRes.status, 404);

  // Booking attempt -> 400
  const bookRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guestToken}`,
    },
    body: JSON.stringify({
      roomId: testRoomId,
      checkInDate: '2027-08-01',
      checkOutDate: '2027-08-03',
      guestsCount: 2,
    }),
  });
  assert.equal(bookRes.status, 400);
});

test('12. Owner inspects rejected property in dashboard and sees rejectionReason', async () => {
  const res = await fetch(`${baseUrl}/api/properties/owner/my-properties`, {
    headers: {
      Authorization: `Bearer ${ownerToken}`,
    },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  const prop = data.properties.find((p) => p._id === testPropertyId);
  assert.ok(prop);
  assert.equal(prop.status, 'REJECTED');
  assert.equal(prop.rejectionReason, 'Incomplete property address and low resolution imagery.');
});

// =========================================================================
// 4. OWNER RESUBMISSION & ADMIN APPROVAL WORKFLOW
// =========================================================================

test('13. Owner updates details of rejected property -> resets to PENDING_APPROVAL & clears feedback', async () => {
  const res = await fetch(`${baseUrl}/api/properties/${testPropertyId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      location: {
        address: '100 Verified Heritage Boulevard, Civil Lines',
        city: 'Jaipur',
        state: 'Rajasthan',
      },
      coverImage: 'https://images.unsplash.com/photo-1582719508461-905c673771fd',
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.property.status, 'PENDING_APPROVAL', 'Should automatically reset to PENDING_APPROVAL for re-review');
  assert.equal(data.property.rejectionReason, '', 'Rejection reason should be cleared upon update');
});

test('14. Platform Admin approves the property application -> status becomes ACTIVE', async () => {
  const res = await fetch(`${baseUrl}/api/admin/properties/${testPropertyId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      status: 'ACTIVE',
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.property.status, 'ACTIVE');
  assert.equal(data.property.rejectionReason, '');
});

test('15. Approved property is publicly discoverable and bookable', async () => {
  // Public search -> found
  const searchRes = await fetch(`${baseUrl}/api/properties?city=Jaipur`);
  const searchData = await searchRes.json();
  assert.ok(searchData.data.some((p) => p._id === testPropertyId));

  // Direct get by ID -> 200 OK
  const getRes = await fetch(`${baseUrl}/api/properties/${testPropertyId}`);
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  assert.equal(getData.property.name, 'Approval Test Heritage Palace');

  // Rooms list -> 200 OK
  const roomsRes = await fetch(`${baseUrl}/api/properties/${testPropertyId}/rooms`);
  assert.equal(roomsRes.status, 200);
  const roomsData = await roomsRes.json();
  assert.equal(roomsData.rooms.length, 1);

  // Availability -> 200 Available
  const availRes = await fetch(
    `${baseUrl}/api/bookings/rooms/${testRoomId}/availability?checkInDate=2027-08-10&checkOutDate=2027-08-12`
  );
  assert.equal(availRes.status, 200);
  const availData = await availRes.json();
  assert.equal(availData.available, true);

  // Booking -> 201 Confirmed
  const bookRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guestToken}`,
    },
    body: JSON.stringify({
      roomId: testRoomId,
      checkInDate: '2027-08-10',
      checkOutDate: '2027-08-12',
      guestsCount: 2,
    }),
  });

  assert.equal(bookRes.status, 201);
  const bookData = await bookRes.json();
  assert.equal(bookData.success, true);
  assert.equal(bookData.booking.status, 'CONFIRMED');
});

test('16. Owner can pause (INACTIVE) and resume (ACTIVE) an approved property', async () => {
  // Pause
  const pauseRes = await fetch(`${baseUrl}/api/properties/${testPropertyId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({ status: 'INACTIVE' }),
  });
  assert.equal(pauseRes.status, 200);
  const pauseData = await pauseRes.json();
  assert.equal(pauseData.property.status, 'INACTIVE');

  // Reactivate
  const resumeRes = await fetch(`${baseUrl}/api/properties/${testPropertyId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({ status: 'ACTIVE' }),
  });
  assert.equal(resumeRes.status, 200);
  const resumeData = await resumeRes.json();
  assert.equal(resumeData.property.status, 'ACTIVE');
});

test('17. Platform Admin overview correctly reports pending and active metrics', async () => {
  const res = await fetch(`${baseUrl}/api/admin/overview`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.overview.properties.total >= 1);
  assert.ok(data.overview.properties.active >= 1);
  assert.equal(typeof data.overview.properties.pending, 'number');
  assert.equal(typeof data.overview.properties.rejected, 'number');
});
