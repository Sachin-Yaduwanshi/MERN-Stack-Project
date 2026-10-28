import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { connectDB } from '../src/config/db.js';
import { generateToken } from '../src/utils/token.js';

let server;
let baseUrl;

const timestamp = Date.now();
const testGuestEmail = `testguest_${timestamp}@staypulse.test`;
const testOwnerEmail = `testowner_${timestamp}@staypulse.test`;
const testSuspendedEmail = `testsuspended_${timestamp}@staypulse.test`;
const testAdminEmail = `testadmin_${timestamp}@staypulse.test`;
const testPassword = 'Password123#';

let guestToken;
let ownerToken;
let adminToken;
let suspendedToken;

before(async () => {
  // Connect to MongoDB
  await connectDB();

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
  // Clean up test users from MongoDB
  await User.deleteMany({
    email: {
      $in: [
        testGuestEmail,
        testOwnerEmail,
        testSuspendedEmail,
        testAdminEmail,
        `fake_admin_${timestamp}@staypulse.test`,
      ],
    },
  });

  // Close server and database connection
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
});

test('1. Valid Guest Registration', async () => {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Guest',
      email: testGuestEmail,
      password: testPassword,
      role: 'GUEST',
    }),
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.token, 'Token should be returned');
  assert.equal(data.user.email, testGuestEmail);
  assert.equal(data.user.role, 'GUEST');
  assert.equal(data.user.password, undefined, 'Password hash must never be returned');

  guestToken = data.token;
});

test('2. Valid Property Owner Registration', async () => {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Owner',
      email: testOwnerEmail,
      password: testPassword,
      role: 'PROPERTY_OWNER',
    }),
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.token);
  assert.equal(data.user.role, 'PROPERTY_OWNER');
  assert.equal(data.user.password, undefined);

  ownerToken = data.token;
});

test('3. Rejection of Public PLATFORM_ADMIN Registration', async () => {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Fake Admin Attempt',
      email: `fake_admin_${timestamp}@staypulse.test`,
      password: testPassword,
      role: 'PLATFORM_ADMIN',
    }),
  });

  assert.equal(res.status, 403, 'Self-registration as PLATFORM_ADMIN must be rejected with 403');
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.message, /PLATFORM_ADMIN/);
});

test('4. Duplicate Email Registration Rejection', async () => {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate Guest',
      email: testGuestEmail, // Already registered in test 1
      password: testPassword,
      role: 'GUEST',
    }),
  });

  assert.equal(res.status, 409, 'Duplicate email should yield 409 Conflict');
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.message, /already exists/i);
});

test('5. Valid Login with Correct Password', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testGuestEmail,
      password: testPassword,
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.token);
  assert.equal(data.user.email, testGuestEmail);
  assert.equal(data.user.password, undefined);
});

test('6. Login Rejection with Incorrect Password', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testGuestEmail,
      password: 'WrongPassword999!',
    }),
  });

  assert.equal(res.status, 401, 'Wrong password must yield 401 Unauthorized');
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.message, /invalid/i);
});

test('7. Missing or Invalid Authorization Header on Protected Route', async () => {
  // Test missing header
  const resMissing = await fetch(`${baseUrl}/api/auth/me`);
  assert.equal(resMissing.status, 401);
  const dataMissing = await resMissing.json();
  assert.match(dataMissing.message, /token provided/i);

  // Test malformed / invalid signature token
  const resInvalid = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: 'Bearer this_is_a_completely_fake_token_12345' },
  });
  assert.equal(resInvalid.status, 401);
  const dataInvalid = await resInvalid.json();
  assert.match(dataInvalid.message, /invalid or expired/i);
});

test('8. Current User Profile (/api/auth/me) with Valid Token', async () => {
  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.user.email, testGuestEmail);
  assert.equal(data.user.role, 'GUEST');
});

test('9. Role Authorization: Guest allowed on Guest-Only Endpoint', async () => {
  const res = await fetch(`${baseUrl}/api/test-roles/guest-only`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
});

test('10. Access Denied: Property Owner blocked from Guest-Only Endpoint', async () => {
  const res = await fetch(`${baseUrl}/api/test-roles/guest-only`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });

  assert.equal(res.status, 403, 'Cross-role access must yield 403 Forbidden');
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.message, /Forbidden/);
});

test('11. Protection of Private Guest Data: Platform Admin blocked from Guest-Only Endpoint', async () => {
  // Create an admin user for testing
  const adminUser = await User.create({
    name: 'Test Platform Admin',
    email: testAdminEmail,
    password: testPassword,
    role: 'PLATFORM_ADMIN',
    status: 'ACTIVE',
  });
  adminToken = generateToken(adminUser._id, adminUser.role);

  const res = await fetch(`${baseUrl}/api/test-roles/guest-only`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  assert.equal(
    res.status,
    403,
    'Platform Admin must NOT have authorization to access private guest endpoint'
  );
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.message, /Forbidden/);
});

test('12. Role Authorization: Property Owner allowed on Owner-Only Endpoint', async () => {
  const res = await fetch(`${baseUrl}/api/test-roles/owner-only`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
});

test('13. Access Denied: Guest blocked from Owner-Only Endpoint', async () => {
  const res = await fetch(`${baseUrl}/api/test-roles/owner-only`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });

  assert.equal(res.status, 403, 'Guest must be blocked from owner endpoint');
  const data = await res.json();
  assert.equal(data.success, false);
});

test('14. Suspended Account Access Rejection', async () => {
  // Create suspended user
  const suspendedUser = await User.create({
    name: 'Suspended Guest',
    email: testSuspendedEmail,
    password: testPassword,
    role: 'GUEST',
    status: 'SUSPENDED',
  });

  suspendedToken = generateToken(suspendedUser._id, suspendedUser.role);

  // Attempt login with suspended account
  const resLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testSuspendedEmail,
      password: testPassword,
    }),
  });

  assert.equal(resLogin.status, 403, 'Suspended account login must return 403 Forbidden');
  const dataLogin = await resLogin.json();
  assert.match(dataLogin.message, /suspended/i);

  // Attempt to access protected endpoint with token
  const resProtected = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${suspendedToken}` },
  });

  assert.equal(resProtected.status, 403, 'Suspended user token must be rejected with 403');
  const dataProtected = await resProtected.json();
  assert.match(dataProtected.message, /suspended/i);
});
