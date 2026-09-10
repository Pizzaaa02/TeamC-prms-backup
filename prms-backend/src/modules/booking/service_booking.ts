import { BookingStatus } from '@prisma/client';
import { prisma } from '../../db';

export type BookingActor = { id: string; role: string };

export class BookingError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message);
    this.name = 'BookingError';
  }
}

const bookingInclude = {
  user: { select: { id: true, full_name: true, email: true } },
  property: true,
} as const;

const allowedStatuses = new Set(Object.values(BookingStatus));
const statusTransitions: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN: ['CHECKED_OUT'],
  CHECKED_OUT: [],
  CANCELLED: [],
};

function actorWhere(actor: BookingActor): any {
  if (actor.role === 'Admin') return {};
  if (actor.role === 'Tenant') return { userId: actor.id };
  if (actor.role === 'Landlord') return { property: { ownerId: actor.id } };
  if (actor.role === 'Agent') return { property: { agentProperties: { some: { agent: { userId: actor.id } } } } };
  return { id: '__not_authorized__' };
}

function parseBookingDate(value: unknown, label: string): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BookingError(`${label} must use YYYY-MM-DD format`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new BookingError(`${label} is not a valid date`);
  }
  return date;
}

function validateDateRange(startValue: unknown, endValue: unknown) {
  const startDate = parseBookingDate(startValue, 'Start date');
  const endDate = parseBookingDate(endValue, 'End date');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (startDate < today) throw new BookingError('Start date cannot be in the past');
  if (endDate <= startDate) throw new BookingError('End date must be after the start date');
  if (endDate.getTime() - startDate.getTime() > 366 * 24 * 60 * 60 * 1000) throw new BookingError('Booking period cannot exceed one year');
  return { startDate, endDate };
}

async function findAuthorizedBooking(id: string, actor: BookingActor) {
  return prisma.booking.findFirst({ where: { id, ...actorWhere(actor) }, include: bookingInclude });
}

async function requireAuthorizedBooking(id: string, actor: BookingActor) {
  const booking = await findAuthorizedBooking(id, actor);
  if (!booking) throw new BookingError('Booking not found', 404);
  return booking;
}

export async function getBookings(actor: BookingActor, page = 1, limit = 10, userId?: string, status?: string) {
  const where: any = { ...actorWhere(actor) };
  if (userId) where.userId = userId;
  if (status) {
    const normalized = status.toUpperCase() as BookingStatus;
    if (!allowedStatuses.has(normalized)) throw new BookingError('Invalid booking status');
    where.status = normalized;
  }
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({ where, skip: (safePage - 1) * safeLimit, take: safeLimit, orderBy: { created_at: 'desc' }, include: bookingInclude }),
    prisma.booking.count({ where }),
  ]);
  return { bookings, total, page: safePage, limit: safeLimit };
}

export async function getBookingById(id: string, actor: BookingActor) {
  return findAuthorizedBooking(id, actor);
}

export async function createBooking(data: { propertyId?: string; start_date?: string; end_date?: string }, userId: string) {
  if (!data.propertyId) throw new BookingError('Property is required');
  const { startDate, endDate } = validateDateRange(data.start_date, data.end_date);
  const property = await prisma.property.findUnique({ where: { id: data.propertyId } });
  if (!property || property.status !== 'AVAILABLE') throw new BookingError('Property is not available');
  if (property.availableFrom && startDate < property.availableFrom) throw new BookingError('Property is not available from the selected start date');
  if (property.availableTo && endDate > property.availableTo) throw new BookingError('Selected end date is outside the property availability period');
  const overlap = await checkOverlap(property.id, startDate, endDate);
  if (overlap.hasOverlap) throw new BookingError('The selected dates are no longer available');
  return prisma.booking.create({
    data: { propertyId: property.id, userId, start_date: startDate, end_date: endDate, totalAmount: property.rent },
    include: bookingInclude,
  });
}

async function changeStatus(id: string, status: BookingStatus, actor: BookingActor) {
  const booking = await requireAuthorizedBooking(id, actor);
  if (!statusTransitions[booking.status].includes(status)) throw new BookingError(`Cannot change booking from ${booking.status} to ${status}`);
  return prisma.booking.update({ where: { id }, data: { status }, include: bookingInclude });
}

export async function updateBooking(id: string, data: { status?: string }, actor: BookingActor) {
  if (!data.status) throw new BookingError('Status is required');
  const status = data.status.toUpperCase() as BookingStatus;
  if (!allowedStatuses.has(status)) throw new BookingError('Invalid booking status');
  if (status === 'CONFIRMED') return confirmBooking(id, actor);
  return changeStatus(id, status, actor);
}

export async function confirmBooking(id: string, actor: BookingActor) {
  const booking = await requireAuthorizedBooking(id, actor);
  if (booking.status !== 'PENDING') throw new BookingError('Only pending bookings can be confirmed');
  const conflict = await checkOverlap(booking.propertyId, booking.start_date, booking.end_date, booking.id, ['CONFIRMED', 'CHECKED_IN']);
  if (conflict.hasOverlap) throw new BookingError('This property already has an active booking for the selected dates');
  const amount = booking.totalAmount || booking.property.rent;
  const terms = `Rental agreement for ${booking.property.title}. Term: ${booking.start_date.toISOString().slice(0, 10)} to ${booking.end_date.toISOString().slice(0, 10)}. Rent: RM ${amount.toFixed(2)}. The tenant shall use the property lawfully, pay amounts when due, and report maintenance issues promptly. The landlord shall provide the premises in a habitable condition and process personal data only for the rental purpose described in the PRMS privacy notice.`;
  return prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({ where: { id }, data: { status: 'CONFIRMED', paymentStatus: 'PENDING', totalAmount: amount }, include: bookingInclude });
    await tx.rentalAgreement.upsert({ where: { bookingId: id }, create: { bookingId: id, propertyId: booking.propertyId, tenantId: booking.userId, status: 'DRAFT', terms }, update: { terms } });
    const due = new Date(booking.start_date);
    await tx.payment.create({ data: { bookingId: id, userId: booking.userId, amount, type: 'rent', method: 'simulation', status: 'PENDING', due_date: due } });
    await tx.invoice.create({ data: { bookingId: id, propertyId: booking.propertyId, userId: booking.userId, amount, status: 'PENDING', due_date: due } });
    await tx.notification.create({ data: { userId: booking.userId, type: 'BOOKING_CONFIRMED', title: 'Booking confirmed', message: `${booking.property.title} has been approved. Your agreement and payment are ready.` } });
    await tx.notification.create({ data: { userId: booking.property.ownerId, type: 'BOOKING_CONFIRMED', title: 'Booking approved', message: `The booking for ${booking.property.title} has been confirmed.` } });
    return updated;
  });
}

export async function rejectBooking(id: string, actor: BookingActor) {
  return changeStatus(id, 'CANCELLED', actor);
}

export async function cancelBooking(id: string, actor: BookingActor) {
  const booking = await requireAuthorizedBooking(id, actor);
  if (actor.role === 'Agent') throw new BookingError('Agents have read-only booking access', 403);
  if (actor.role === 'Tenant' && booking.status !== 'PENDING') throw new BookingError('Only pending bookings can be withdrawn by the tenant');
  if (!['PENDING', 'CONFIRMED'].includes(booking.status)) throw new BookingError('This booking can no longer be cancelled');
  return prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' }, include: bookingInclude });
}

export async function getMyBookings(userId: string) {
  return prisma.booking.findMany({ where: { userId }, include: { property: true }, orderBy: { created_at: 'desc' } });
}

export async function checkOverlap(
  propertyId: string,
  startValue: string | Date,
  endValue: string | Date,
  excludeBookingId?: string,
  statuses: BookingStatus[] = ['PENDING', 'CONFIRMED', 'CHECKED_IN'],
): Promise<{ hasOverlap: boolean; conflictCount: number }> {
  const range = startValue instanceof Date && endValue instanceof Date ? { startDate: startValue, endDate: endValue } : validateDateRange(startValue, endValue);
  const conflictCount = await prisma.booking.count({ where: { propertyId, status: { in: statuses }, id: excludeBookingId ? { not: excludeBookingId } : undefined, start_date: { lt: range.endDate }, end_date: { gt: range.startDate } } });
  return { hasOverlap: conflictCount > 0, conflictCount };
}

export async function getBookingSummary(actor: BookingActor) {
  const scope = actorWhere(actor);
  const [pending, confirmed, active, completed, cancelled] = await Promise.all([
    prisma.booking.count({ where: { ...scope, status: 'PENDING' } }),
    prisma.booking.count({ where: { ...scope, status: 'CONFIRMED' } }),
    prisma.booking.count({ where: { ...scope, status: 'CHECKED_IN' } }),
    prisma.booking.count({ where: { ...scope, status: 'CHECKED_OUT' } }),
    prisma.booking.count({ where: { ...scope, status: 'CANCELLED' } }),
  ]);
  return { pending, confirmed, active, completed, cancelled, total: pending + confirmed + active + completed + cancelled };
}
