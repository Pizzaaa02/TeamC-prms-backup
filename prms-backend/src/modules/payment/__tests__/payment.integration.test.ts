import express from 'express';
import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

jest.mock('../../../config', () => ({ env: { JWT_SECRET: 'payment-test-secret' } }));
jest.mock('../../../db', () => {
  const { PrismaClient } = require('@prisma/client');
  const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
  return { prisma: new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.PAYMENT_TEST_DB }) }) };
});
let db: any;
let server: Server;
let base: string;
let temp: string;
const token = (id: string) => jwt.sign({ userId: id }, 'payment-test-secret');
async function request(path: string, user?: string, body?: unknown, method = 'GET') {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: 'Bearer ' + token(user) } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json() as any };
}
async function simulate(user = 'tenant', outcome = 'success') {
  return request('/payments/charge', user, { outcome }, 'PATCH');
}

beforeAll(async () => {
  temp = mkdtempSync(join(tmpdir(), 'prms-payment-test-'));
  process.env.PAYMENT_TEST_DB = join(temp, 'test.db');
  const sql = execFileSync(process.execPath, [join(process.cwd(), 'node_modules/prisma/build/index.js'), 'migrate', 'diff', '--from-empty', '--to-schema', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' });
  const sqlite = new (require('better-sqlite3'))(process.env.PAYMENT_TEST_DB);
  sqlite.exec(sql);
  sqlite.close();
  db = require('../../../db').prisma;
  for (const [id, role] of [['tenant','Tenant'],['other','Tenant'],['landlord','Landlord'],['outsider','Landlord'],['admin','Admin'],['agent','Agent']]) {
    await db.role.upsert({ where: { name: role }, create: { name: role }, update: {} });
    await db.user.create({ data: { id, firebase_uid: id, email: id + '@example.test', full_name: id, passwordHash: 'must-not-leak', refreshToken: 'must-not-leak',
      UserRole: { create: { role: { connect: { name: role } } } } } });
  }
  for (const [id, ownerId] of [['property','landlord'],['other-property','outsider']]) {
    await db.property.create({ data: { id, ownerId, title: id, address: 'Test address', rent: 1500 } });
  }
  const app = express();
  app.use(express.json());
  // Alias used by the tests still enters the real authenticated payment router.
  app.use((req, _res, next) => { if (req.method === 'PATCH' && req.url === '/payments/charge') req.url = '/payments/charge/simulate'; next(); });
  app.use('/payments', require('../routes_payment').default);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + (server.address() as any).port;
}, 30000);
beforeEach(async () => {
  await db.notification.deleteMany();
  await db.auditLog.deleteMany();
  await db.payment.deleteMany();
  await db.invoice.deleteMany();
  await db.rentalAgreement.deleteMany();
  await db.booking.deleteMany();
  await db.booking.create({ data: { id: 'booking', propertyId: 'property', userId: 'tenant', status: 'CONFIRMED', start_date: new Date('2030-01-01'), end_date: new Date('2030-02-01'), totalAmount: 1500 } });
  await db.rentalAgreement.create({ data: { id: 'agreement', bookingId: 'booking', propertyId: 'property', tenantId: 'tenant', terms: 'Test terms', status: 'ACTIVE', tenantSignature: 'Tenant', landlordSignature: 'Landlord' } });
  await db.payment.create({ data: { id: 'charge', bookingId: 'booking', userId: 'tenant', amount: 1500, due_date: new Date('2030-01-01') } });
  await db.invoice.create({ data: { id: 'invoice', bookingId: 'booking', propertyId: 'property', userId: 'tenant', amount: 1500, due_date: new Date('2030-01-01') } });
});
afterAll(async () => {
  if (server) await new Promise<void>(resolve => server.close(() => resolve()));
  if (db) await db.$disconnect();
  if (temp) rmSync(temp, { recursive: true, force: true });
  delete process.env.PAYMENT_TEST_DB;
});

test('authentication and all four role boundaries are enforced', async () => {
  expect((await request('/payments')).status).toBe(401);
  for (const user of ['tenant','landlord','admin']) expect((await request('/payments', user)).status).toBe(200);
  expect((await request('/payments', 'agent')).status).toBe(403);
  for (const user of ['landlord','admin','agent']) expect((await simulate(user)).status).toBe(403);
  for (const user of ['tenant','agent']) expect((await request('/payments/summary', user)).status).toBe(403);
});
test('other tenant and landlord cannot read or mutate the charge', async () => {
  for (const user of ['other','outsider']) {
    expect((await request('/payments/charge', user)).status).toBe(404);
    expect((await request('/payments', user)).body.data).toEqual([]);
  }
  expect((await simulate('other')).status).toBe(404);
});
test('list and receipt never expose authentication fields', async () => {
  for (const path of ['/payments','/payments/charge']) {
    const result = await request(path, 'tenant');
    expect(JSON.stringify(result.body)).not.toContain('must-not-leak');
    expect(JSON.stringify(result.body)).not.toContain('passwordHash');
  }
});
test('manual paid-status and arbitrary-charge endpoints are closed', async () => {
  for (const user of ['tenant','landlord','admin','agent']) {
    expect((await request('/payments', user, { amount: 1, status: 'PAID' }, 'POST')).status).toBe(403);
    expect((await request('/payments/charge/mark-paid', user, {}, 'PATCH')).status).toBe(403);
  }
  expect(await db.payment.count()).toBe(1);
});
test('failure is retryable; successful replay preserves reference and notifications', async () => {
  expect((await simulate('tenant','failure')).body.data.status).toBe('FAILED');
  expect((await db.invoice.findUnique({ where: { id: 'invoice' } })).status).toBe('FAILED');
  expect((await db.booking.findUnique({ where: { id: 'booking' } })).paymentStatus).toBe('FAILED');
  const paid = await simulate();
  expect(paid.status).toBe(200);
  expect(paid.body.data.status).toBe('PAID');
  expect(paid.body.data.reference).toMatch(/^SIM-/);
  expect((await db.invoice.findUnique({ where: { id: 'invoice' } })).status).toBe('PAID');
  expect((await db.booking.findUnique({ where: { id: 'booking' } })).paymentStatus).toBe('PAID');
  const notifications = await db.notification.count();
  expect((await simulate()).body.data.reference).toBe(paid.body.data.reference);
  expect(await db.notification.count()).toBe(notifications);
  expect(await db.auditLog.count({ where: { action: 'SIMULATE_PAYMENT' } })).toBe(3);
});
test.each(['CANCELLED','CHECKED_OUT','PENDING'])('blocks %s bookings without changing records', async status => {
  await db.booking.update({ where: { id: 'booking' }, data: { status } });
  expect((await simulate()).status).toBe(409);
  expect((await db.payment.findUnique({ where: { id: 'charge' } })).status).toBe('PENDING');
});
test.each([{ status: 'DRAFT' }, { landlordSignature: null }, { tenantSignature: null }])('blocks incomplete/legacy agreement %j', async data => {
  await db.rentalAgreement.update({ where: { id: 'agreement' }, data });
  expect((await simulate()).status).toBe(409);
});
test('invalid outcomes and invoice mismatches cannot settle a payment', async () => {
  expect((await simulate('tenant','invalid')).status).toBe(400);
  await db.invoice.update({ where: { id: 'invoice' }, data: { amount: 1 } });
  expect((await simulate()).status).toBe(409);
});
test('landlord summaries are scoped and status filtering/pagination work', async () => {
  await simulate();
  expect((await request('/payments/summary','landlord')).body.data.collectedAmount).toBe(1500);
  expect((await request('/payments/summary','outsider')).body.data.collectedAmount).toBe(0);
  expect((await request('/payments?status=failed','tenant')).body.data).toEqual([]);
  expect((await request('/payments?status=paid&limit=1','tenant')).body.pagination.total).toBe(1);
  expect((await request('/payments?status=invalid','tenant')).status).toBe(400);
});

