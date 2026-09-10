import { PaymentStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../db';

export type PaymentActor = { id: string; role: string };
export class PaymentError extends Error {
  constructor(message: string, public statusCode = 400) { super(message); }
}
const outstanding: PaymentStatus[] = ['PENDING', 'UNPAID', 'FAILED'];
const include = {
  user: { select: { id: true, full_name: true, email: true } },
  booking: { include: { property: true, rentalAgreement: { select: { status: true, tenantSignature: true, landlordSignature: true } } } },
} as const;

function scope(actor: PaymentActor): Prisma.PaymentWhereInput {
  if (actor.role === 'Admin') return {};
  if (actor.role === 'Tenant') return { userId: actor.id };
  if (actor.role === 'Landlord') return { booking: { property: { ownerId: actor.id } } };
  throw new PaymentError('Payment access is not permitted for this role', 403);
}
function bookingScope(actor: PaymentActor): Prisma.BookingWhereInput {
  if (actor.role === 'Admin') return {};
  if (actor.role === 'Landlord') return { property: { ownerId: actor.id } };
  throw new PaymentError('Finance summary access denied', 403);
}

export async function getFinanceSummary(actor: PaymentActor) {
  const bookingWhere = bookingScope(actor);
  const where = scope(actor);
  const pendingWhere = { ...where, status: { in: outstanding }, booking: { ...bookingWhere, status: { in: ['CONFIRMED', 'CHECKED_IN'] as any } } };
  const [paid, pending, collected, pendingCount, overdue, totalBookings, records] = await Promise.all([
    prisma.payment.aggregate({ where: { ...where, status: 'PAID' }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: pendingWhere, _sum: { amount: true } }),
    prisma.payment.count({ where: { ...where, status: 'PAID' } }),
    prisma.payment.count({ where: pendingWhere }),
    prisma.payment.count({ where: { ...pendingWhere, due_date: { lt: new Date() } } }),
    prisma.booking.count({ where: bookingWhere }),
    prisma.payment.findMany({ where: { ...where, status: 'PAID' }, include: { booking: { include: { property: { select: { id: true, title: true } } } } } }),
  ]);
  const grouped = new Map<string, { property: string; amount: number }>();
  for (const item of records) {
    const property = item.booking.property;
    const row = grouped.get(property.id) || { property: property.title, amount: 0 };
    row.amount += item.amount;
    grouped.set(property.id, row);
  }
  const total = paid._sum.amount || 0;
  return { total, totalRevenue: total, pending: pendingCount, pendingAmount: pending._sum.amount || 0,
    collected, collectedAmount: total, overdue, totalBookings, byProperty: [...grouped.values()], simulation: true };
}

export async function getPayments(page = 1, limit = 10, actor: PaymentActor, status?: string) {
  const where = scope(actor);
  if (status) {
    const normalized = status.toUpperCase();
    if (!Object.values(PaymentStatus).includes(normalized as PaymentStatus)) throw new PaymentError('Invalid payment status');
    where.status = normalized as PaymentStatus;
  }
  page = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  limit = Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit))) : 10;
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { created_at: 'desc' }, include }),
    prisma.payment.count({ where }),
  ]);
  return { payments, total, page, limit };
}
export async function getPaymentById(id: string, actor: PaymentActor) {
  return prisma.payment.findFirst({ where: { id, ...scope(actor) }, include });
}

// Charges originate only from booking approval; clients cannot supply amounts or paid status.
export async function simulatePayment(id: string, actor: PaymentActor, outcome: unknown = 'success') {
  if (actor.role !== 'Tenant') throw new PaymentError('Only tenants may simulate their own payment', 403);
  if (outcome !== 'success' && outcome !== 'failure') throw new PaymentError('Choose success or failure');
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({ where: { id, userId: actor.id }, include });
    if (!payment) throw new PaymentError('Payment not found', 404);
    // Repeated successful requests return the original receipt without side effects.
    if (payment.status === 'PAID') return payment;
    if (!outstanding.includes(payment.status)) throw new PaymentError('This payment cannot be processed', 409);
    if (!['CONFIRMED', 'CHECKED_IN'].includes(payment.booking.status)) throw new PaymentError('The booking is not eligible for payment', 409);
    const agreement = payment.booking.rentalAgreement;
    if (!agreement || agreement.status !== 'ACTIVE' || !agreement.tenantSignature || !agreement.landlordSignature) {
      throw new PaymentError('Both parties must sign the active agreement before payment', 409);
    }
    if (!Number.isFinite(payment.amount) || payment.amount <= 0) throw new PaymentError('Invalid charge amount', 409);
    // Existing workflow has one rent charge/invoice per booking. Fail closed on ambiguous legacy data.
    const invoices = await tx.invoice.findMany({ where: { bookingId: payment.bookingId } });
    const charges = await tx.payment.count({ where: { bookingId: payment.bookingId } });
    if (charges !== 1 || invoices.length !== 1 || invoices[0].userId !== payment.userId ||
        invoices[0].amount !== payment.amount || !outstanding.includes(invoices[0].status)) {
      throw new PaymentError('The charge and invoice need review before payment', 409);
    }
    const status = outcome === 'success' ? 'PAID' : 'FAILED';
    const changed = await tx.payment.updateMany({
      where: { id, status: payment.status, updated_at: payment.updated_at },
      data: { status, method: 'simulation', reference: 'SIM-' + randomUUID(), paid_at: status === 'PAID' ? new Date() : null },
    });
    if (changed.count !== 1) throw new PaymentError('Payment changed. Refresh before retrying', 409);
    await tx.invoice.update({ where: { id: invoices[0].id }, data: { status } });
    const unpaid = await tx.payment.count({ where: { bookingId: payment.bookingId, status: { not: 'PAID' } } });
    await tx.booking.update({ where: { id: payment.bookingId }, data: { paymentStatus: unpaid === 0 ? 'PAID' : status === 'FAILED' ? 'FAILED' : 'PENDING' } });
    const updated = await tx.payment.findUniqueOrThrow({ where: { id }, include });
    await tx.notification.create({ data: { userId: actor.id, type: 'PAYMENT', title: status === 'PAID' ? 'Simulated payment successful' : 'Simulated payment failed',
      message: status === 'PAID' ? 'No money was transferred. Receipt reference: ' + updated.reference : 'No money was transferred. You can retry this payment.' } });
    if (status === 'PAID') await tx.notification.create({ data: { userId: payment.booking.property.ownerId, type: 'PAYMENT',
      title: 'Simulated rent payment received', message: payment.booking.property.title + ': ' + updated.reference + '. No money was transferred.' } });
    return updated;
  });
}

