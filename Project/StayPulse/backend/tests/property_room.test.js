import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Property from '../src/models/Property.js';
import Room from '../src/models/Room.js';
import { connectDB } from '../src/config/db.js';
import { generateToken } from '../src/utils/token.js';

let server;
let baseUrl;

const timestamp = Date.now();
const owner1Email = `owner1_${timestamp}@staypulse.test`;
const owner2Email = `owner2_${timestamp}@staypulse.test`;
const guestEmail = `guest_${timestamp}@staypulse.test`;

let owner1User;
let owner2User;
let guestUser;

let owner1Token;
let owner2Token;
let guestToken;

let createdPropertyId;
let createdRoomId;

before(async () => {
  await connectDB();

  // Create temporary users for testing
  owner1User = await User.create({
    name: 'Owner 1',
    email: owner1Email,
    password: 'Password123#',
    role: 'PROPERTY_OWNER',
    ownerAvatarVisible: true,
  });
  owner1Token = generateToken(owner1User._id, owner1User.role);

  owner2User = await User.create({
    name: 'Owner 2',
    email: owner2Email,
    password: 'Password123#',
    role: 'PROPERTY_OWNER',
    ownerAvatarVisible: false, // Avatar suppressed from public view
  });
  owner2Token = generateToken(owner2User._id, owner2User.role);

  guestUser = await User.create({
    name: 'Test Guest',
    email: guestEmail,
    password: 'Password123#',
    role: 'GUEST',
  });
  guestToken = generateToken(guestUser._id, guestUser.role);

  // Start temporary test server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  // Clean up test documents
  if (createdPropertyId) {
    await Room.deleteMany({ property: createdPropertyId });
    await Property.findByIdAndDelete(createdPropertyId);
  }
  await User.deleteMany({
    email: { $in: [owner1Email, owner2Email, guestEmail] },
  });

  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
});

test('1. Property Creation by Authenticated Owner', async () => {
  const res = await fetch(`${baseUrl}/api/properties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner1Token}`,
    },
    body: JSON.stringify({
      name: 'Owner 1 Luxury Villa',
      tagline: 'Private infinity pool with valley view',
      description: 'Handcrafted luxury villa offering private chef service and infinity pool.',
      location: {
        address: '10 Sunrise Hill Road',
        city: 'Udaipur',
        state: 'Rajasthan',
      },
      startingPrice: 6500,
      coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      amenities: ['Private Pool', 'Free WiFi', 'Chef Service'],
    }),
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.property.name, 'Owner 1 Luxury Villa');
  assert.equal(data.property.owner.toString(), owner1User._id.toString());

  createdPropertyId = data.property._id;
});

test('2. Rejection of Unauthenticated Property Creation', async () => {
  const res = await fetch(`${baseUrl}/api/properties`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Unauthenticated Hotel',
      description: 'Should fail without token',
      location: { address: 'Nowhere', city: 'Goa', state: 'Goa' },
      startingPrice: 3000,
      coverImage: 'http://example.com/cover.jpg',
    }),
  });

  assert.equal(res.status, 401, 'Unauthenticated request must return 401');
});

test('3. Rejection of Non-Owner (Guest) Creating Property', async () => {
  const res = await fetch(`${baseUrl}/api/properties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guestToken}`,
    },
    body: JSON.stringify({
      name: 'Guest Owned Hotel Attempt',
      description: 'Should fail for GUEST role',
      location: { address: 'Nowhere', city: 'Goa', state: 'Goa' },
      startingPrice: 3000,
      coverImage: 'http://example.com/cover.jpg',
    }),
  });

  assert.equal(res.status, 403, 'Guest role must return 403 Forbidden');
});

test('4. Legitimate Property Owner Updating Property', async () => {
  const res = await fetch(`${baseUrl}/api/properties/${createdPropertyId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner1Token}`,
    },
    body: JSON.stringify({
      tagline: 'Updated: Private heated pool with panoramic mountain view',
      startingPrice: 7200,
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.property.startingPrice, 7200);
});

test('5. Rejection of Cross-Owner Property Modification', async () => {
  // Owner 2 attempts to modify Owner 1's property
  const res = await fetch(`${baseUrl}/api/properties/${createdPropertyId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner2Token}`, // Owner 2 token!
    },
    body: JSON.stringify({
      name: 'Malicious Hijack Attempt',
      startingPrice: 100,
    }),
  });

  assert.equal(res.status, 403, 'Cross-owner modification must be strictly rejected with 403');
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.message, /another owner/i);
});

test('6. Room Creation under Property by Legitimate Owner', async () => {
  const res = await fetch(`${baseUrl}/api/properties/${createdPropertyId}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner1Token}`,
    },
    body: JSON.stringify({
      roomType: 'Presidential Pool Villa',
      description: 'Two-bedroom villa with private heated plunge pool and personal butler.',
      capacity: 4,
      bedType: '2 King Beds',
      pricePerNight: 7200,
      amenities: ['Plunge Pool', 'Butler Service', 'Free WiFi'],
    }),
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.room.roomType, 'Presidential Pool Villa');
  assert.equal(data.room.capacity, 4);

  createdRoomId = data.room._id;
});

test('7. Rejection of Cross-Owner Room Creation', async () => {
  // Owner 2 attempts to add a room to Owner 1's property
  const res = await fetch(`${baseUrl}/api/properties/${createdPropertyId}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner2Token}`, // Owner 2!
    },
    body: JSON.stringify({
      roomType: 'Intruder Suite',
      capacity: 2,
      bedType: '1 King Bed',
      pricePerNight: 1000,
    }),
  });

  assert.equal(res.status, 403, 'Cannot create rooms on properties owned by others');
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.message, /do not own/i);
});

test('8. Rejection of Invalid Room Capacity (0 capacity)', async () => {
  const res = await fetch(`${baseUrl}/api/properties/${createdPropertyId}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner1Token}`,
    },
    body: JSON.stringify({
      roomType: 'Zero Capacity Room',
      capacity: 0, // Invalid!
      bedType: '1 King Bed',
      pricePerNight: 2000,
    }),
  });

  assert.equal(res.status, 400, 'Capacity < 1 must be rejected');
  const data = await res.json();
  assert.match(data.message, /capacity/i);
});

test('9. Rejection of Negative Room Price', async () => {
  const res = await fetch(`${baseUrl}/api/properties/${createdPropertyId}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner1Token}`,
    },
    body: JSON.stringify({
      roomType: 'Negative Price Room',
      capacity: 2,
      bedType: '1 King Bed',
      pricePerNight: -500, // Invalid!
    }),
  });

  assert.equal(res.status, 400, 'Negative price must be rejected');
  const data = await res.json();
  assert.match(data.message, /price/i);
});

test('10. Rejection of Invalid File Content (Malicious / Fake Magic Bytes)', async () => {
  // Send a text file pretending to be image/jpeg
  const boundary = '----StayPulseBoundary' + Date.now();
  const fakeFileContent = 'Hello world this is plaintext, not an actual image!';
  const multipartBody =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="category"\r\n\r\n` +
    `properties\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="image"; filename="fake_image.jpg"\r\n` +
    `Content-Type: image/jpeg\r\n\r\n` +
    `${fakeFileContent}\r\n` +
    `--${boundary}--\r\n`;

  const res = await fetch(`${baseUrl}/api/uploads`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Authorization: `Bearer ${owner1Token}`,
    },
    body: multipartBody,
  });

  assert.equal(res.status, 400, 'File with non-image magic bytes must be rejected');
  const data = await res.json();
  assert.match(data.message, /Invalid or manipulated image/i);
});

test('11. Valid Base64 Image Upload (Genuine JPEG magic bytes)', async () => {
  // Small genuine 1x1 JPEG with magic bytes FF D8 FF E0
  const genuine1x1JpegBase64 =
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

  const res = await fetch(`${baseUrl}/api/uploads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner1Token}`,
    },
    body: JSON.stringify({
      dataUrl: genuine1x1JpegBase64,
      category: 'properties',
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.match(data.url, /^\/api\/uploads\/properties\//);
});

test('12. Public Listings Respect Owner Avatar Privacy Setting', async () => {
  // Create property under Owner 2 who has ownerAvatarVisible === false
  const propOwner2 = await Property.create({
    owner: owner2User._id,
    name: 'Owner 2 Hidden Avatar Stay',
    description: 'Boutique stay where host prefers privacy.',
    location: { address: 'Apple Grove', city: 'Manali', state: 'Himachal Pradesh' },
    startingPrice: 3500,
    coverImage: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    status: 'ACTIVE',
  });

  const res = await fetch(`${baseUrl}/api/properties?city=Manali`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);

  const found = data.data.find((p) => p._id.toString() === propOwner2._id.toString());
  assert.ok(found);
  // Assert owner avatar is NULL because ownerAvatarVisible is false!
  assert.equal(
    found.owner.avatar,
    null,
    'Host avatar must be hidden from public view when ownerAvatarVisible is false'
  );

  await Property.findByIdAndDelete(propOwner2._id);
});
