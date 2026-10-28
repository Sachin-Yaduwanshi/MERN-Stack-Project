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
const adminEmail = `admin_dash_${timestamp}@staypulse.test`;
const ownerEmail = `owner_dash_${timestamp}@staypulse.test`;
const owner2Email = `owner2_dash_${timestamp}@staypulse.test`;
const guestEmail = `guest_dash_${timestamp}@staypulse.test`;

let adminUser, ownerUser, owner2User, guestUser;
let adminToken, ownerToken, owner2Token, guestToken;
let testProperty, testRoom, testBooking;

before(async () => {
  await connectDB();

  // Create Users
  adminUser = await User.create({
    name: 'Platform Administrator',
    email: adminEmail,
    password: 'Password123#',
    role: 'PLATFORM_ADMIN',
  });
  adminToken = generateToken(adminUser._id, adminUser.role);

  ownerUser = await User.create({
    name: 'Dashboard Host 1',
    email: ownerEmail,
    password: 'Password123#',
    role: 'PROPERTY_OWNER',
    phone: '+91 98888 11111',
    avatar: '/uploads/profiles/host1.jpg',
    ownerAvatarVisible: true,
  });
  ownerToken = generateToken(ownerUser._id, ownerUser.role);

  owner2User = await User.create({
    name: 'Dashboard Host 2',
    email: owner2Email,
    password: 'Password123#',
    role: 'PROPERTY_OWNER',
    phone: '+91 98888 22222',
    avatar: '/uploads/profiles/host2.jpg',
    ownerAvatarVisible: false, // Avatar hidden
  });
  owner2Token = generateToken(owner2User._id, owner2User.role);

  guestUser = await User.create({
    name: 'Secret Traveler',
    email: guestEmail,
    password: 'Password123#',
    role: 'GUEST',
    phone: '+91 97777 33333',
    avatar: '/uploads/profiles/secret_guest.jpg',
  });
  guestToken = generateToken(guestUser._id, guestUser.role);

  // Create Property & Room
  testProperty = await Property.create({
    name: `Analytics Palace ${timestamp}`,
    tagline: 'Luxury Hotel for Analytics Testing',
    description: 'A test property for dashboard metrics evaluation.',
    owner: ownerUser._id,
    location: {
      address: '100 King Road',
      city: 'Jaipur',
      state: 'Rajasthan',
      country: 'India',
    },
    startingPrice: 5000,
    coverImage: '/uploads/properties/test_prop.jpg',
    status: 'ACTIVE',
  });

  testRoom = await Room.create({
    property: testProperty._id,
    roomType: 'Royal Suite',
    description: 'Spacious royal room with private terrace.',
    pricePerNight: 5000,
    capacity: 2,
    bedType: '1 King Bed',
    status: 'AVAILABLE',
  });

  // Create a confirmed booking under owner 1
  const checkIn = new Date('2027-05-10');
  checkIn.setHours(0, 0, 0, 0);
  const checkOut = new Date('2027-05-12');
  checkOut.setHours(0, 0, 0, 0);

  testBooking = await Booking.create({
    bookingReference: `SP-${timestamp}-TEST`,
    guest: guestUser._id,
    property: testProperty._id,
    room: testRoom._id,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    guestsCount: 2,
    nights: 2,
    pricePerNight: 5000,
    subtotal: 10000,
    taxes: 1200,
    totalPrice: 11200,
    status: 'CONFIRMED',
  });

  // Create reservation slots
  await RoomReservationSlot.create([
    { room: testRoom._id, dateString: '2027-05-10', booking: testBooking._id, status: 'CONFIRMED' },
    { room: testRoom._id, dateString: '2027-05-11', booking: testBooking._id, status: 'CONFIRMED' },
  ]);

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

  // Cleanup Database
  await RoomReservationSlot.deleteMany({ room: testRoom._id });
  await Booking.deleteMany({ _id: testBooking._id });
  await Room.deleteMany({ property: testProperty._id });
  await Property.deleteMany({ owner: { $in: [ownerUser._id, owner2User._id] } });
  await User.deleteMany({
    _id: { $in: [adminUser._id, ownerUser._id, owner2User._id, guestUser._id] },
  });

  await mongoose.disconnect();
});

test('1. Platform Admin Overview API returns system aggregates with zero guest personal details', async () => {
  const res = await fetch(`${baseUrl}/api/admin/overview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(data.overview);

  // Asserts high-level counters exist
  assert.ok(typeof data.overview.users.total === 'number');
  assert.ok(typeof data.overview.properties.total === 'number');
  assert.ok(typeof data.overview.bookings.total === 'number');
  assert.ok(typeof data.overview.bookings.grossBookingVolume === 'number');
  assert.equal(data.overview.system.status, 'operational');

  // Strict Privacy Assertion: Zero individual guest details in overview
  assert.equal(data.overview.guests, undefined, 'Overview must never return individual guest records');
  assert.equal(data.overview.bookingsList, undefined, 'Overview must never return individual booking lists');
});

test('2. Platform Admin Users API returns registered users while enforcing Privacy Firewall on Guests', async () => {
  const res = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.users));

  // Find guest in the list
  const guestInList = data.users.find((u) => u._id === guestUser._id.toString());
  assert.ok(guestInList, 'Guest user should be listed');
  assert.equal(guestInList.name, 'Secret Traveler');
  assert.equal(guestInList.email, guestEmail);

  // PRIVACY FIREWALL: Guest avatar and phone must be strictly suppressed
  assert.equal(guestInList.avatar, undefined, 'Guest avatar must be suppressed from admin users view');
  assert.equal(guestInList.phone, undefined, 'Guest phone number must be suppressed from admin users view');
  assert.equal(guestInList.password, undefined, 'Password hash must never be returned');

  // Verify Owner 2 (hidden avatar) avatar is also suppressed
  const owner2InList = data.users.find((u) => u._id === owner2User._id.toString());
  assert.ok(owner2InList);
  assert.equal(owner2InList.avatar, undefined, 'Hidden owner avatar must be suppressed');
});

test('3. Platform Admin User Status Management: Suspend and Reactivate User', async () => {
  // Admin suspends guest account
  const suspendRes = await fetch(`${baseUrl}/api/admin/users/${guestUser._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'SUSPENDED' }),
  });

  const suspendData = await suspendRes.json();
  assert.equal(suspendRes.status, 200);
  assert.equal(suspendData.success, true);
  assert.equal(suspendData.user.status, 'SUSPENDED');

  // Verify suspended guest cannot access protected endpoints
  const blockedRes = await fetch(`${baseUrl}/api/bookings/my-bookings`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  assert.equal(blockedRes.status, 403, 'Suspended user must be blocked with 403');

  // Admin reactivates account
  const reactivateRes = await fetch(`${baseUrl}/api/admin/users/${guestUser._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'ACTIVE' }),
  });
  assert.equal(reactivateRes.status, 200);
});

test('4. Platform Admin cannot suspend their own account', async () => {
  const selfRes = await fetch(`${baseUrl}/api/admin/users/${adminUser._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'SUSPENDED' }),
  });

  const selfData = await selfRes.json();
  assert.equal(selfRes.status, 400);
  assert.match(selfData.message, /cannot change the status of your own/i);
});

test('5. Platform Admin Properties Moderation: View all properties & Toggle Status', async () => {
  const getRes = await fetch(`${baseUrl}/api/admin/properties`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const getData = await getRes.json();
  assert.equal(getRes.status, 200);
  assert.ok(getData.properties.some((p) => p._id === testProperty._id.toString()));

  // Deactivate property
  const deactRes = await fetch(`${baseUrl}/api/admin/properties/${testProperty._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'INACTIVE' }),
  });

  const deactData = await deactRes.json();
  assert.equal(deactRes.status, 200);
  assert.equal(deactData.property.status, 'INACTIVE');

  // Restore to ACTIVE
  await fetch(`${baseUrl}/api/admin/properties/${testProperty._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'ACTIVE' }),
  });
});

test('6. Non-Admin (Guest and Owner) blocked from all Admin Endpoints with 403', async () => {
  // Guest attempting admin overview
  const guestRes = await fetch(`${baseUrl}/api/admin/overview`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  assert.equal(guestRes.status, 403, 'Guest must receive 403 Forbidden on admin endpoint');

  // Property Owner attempting admin overview
  const ownerRes = await fetch(`${baseUrl}/api/admin/overview`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert.equal(ownerRes.status, 403, 'Owner must receive 403 Forbidden on admin endpoint');

  // Unauthenticated user
  const unauthRes = await fetch(`${baseUrl}/api/admin/overview`);
  assert.equal(unauthRes.status, 401, 'Unauthenticated user must receive 401 Unauthorized');
});

test('7. Property Owner Analytics API returns real scoped metrics and guest booking details', async () => {
  const res = await fetch(`${baseUrl}/api/bookings/owner/analytics`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });

  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.analytics.propertiesCount, 1);
  assert.equal(data.analytics.roomsCount, 1);
  assert.equal(data.analytics.activeBookings, 1);
  assert.equal(data.analytics.totalRevenue, 11200);
  assert.equal(data.analytics.recentBookings.length, 1);

  // Property owner legitimately sees guest contact details for reservation coordination
  const b = data.analytics.recentBookings[0];
  assert.equal(b.guest.name, 'Secret Traveler');
  assert.equal(b.guest.email, guestEmail);
  assert.equal(b.totalPrice, 11200);
});

test('8. Multi-Tenant Isolation: Owner 2 receives zero metrics and zero bookings for Owner 1 properties', async () => {
  const res = await fetch(`${baseUrl}/api/bookings/owner/analytics`, {
    headers: { Authorization: `Bearer ${owner2Token}` },
  });

  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.analytics.propertiesCount, 0);
  assert.equal(data.analytics.roomsCount, 0);
  assert.equal(data.analytics.activeBookings, 0);
  assert.equal(data.analytics.totalRevenue, 0);
  assert.equal(data.analytics.recentBookings.length, 0);
});
