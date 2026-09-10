import { prisma } from '../../db';

export async function getBookings(page = 1, limit = 10, userId?: string, status?: string) {
  const where: any = {};
  if (userId) where.userId = userId;
  // BookingStatus enum values are uppercase; accept either case from callers.
  if (status) where.status = status.toUpperCase();
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { id: 'desc' }, include: { user: { select: { id: true, full_name: true, email: true } }, property: true } }),
    prisma.booking.count({ where }),
  ]);
  return { bookings, total };
}

export async function getBookingById(id: string) {
  return prisma.booking.findUnique({ where: { id }, include: { user: true, property: true } });
}

export async function createBooking(data: { propertyId: string; start_date: string; end_date: string; totalAmount?: number; }, userId: string) {
  return prisma.booking.create({
    data: {
      property: { connect: { id: data.propertyId } },
      start_date: new Date(data.start_date),
      end_date: new Date(data.end_date),
      totalAmount: data.totalAmount,
      user: { connect: { id: userId } },
    },
    include: { user: true, property: true },
  });
}

export async function updateBooking(id: string, data: { status?: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED'; totalAmount?: number; }) {
  return prisma.booking.update({ where: { id }, data, include: { user: true, property: true } });
}

export async function confirmBooking(id: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: { property: true, user: true } });
  if (!booking) throw new Error('Booking not found');
  if (booking.status !== 'PENDING') throw new Error('Only pending bookings can be confirmed');
  const amount = booking.totalAmount || booking.property.rent;
  const terms = `Rental agreement for ${booking.property.title}. Term: ${booking.start_date.toISOString().slice(0, 10)} to ${booking.end_date.toISOString().slice(0, 10)}. Rent: RM ${amount.toFixed(2)}. The tenant shall use the property lawfully, pay amounts when due, and report maintenance issues promptly. The landlord shall provide the premises in a habitable condition and process personal data only for the rental purpose described in the PRMS privacy notice.`;
  return prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({ where: { id }, data: { status: 'CONFIRMED', paymentStatus: 'PENDING', totalAmount: amount }, include: { user: true, property: true } });
    await tx.rentalAgreement.upsert({
      where: { bookingId: id },
      create: { bookingId: id, propertyId: booking.propertyId, tenantId: booking.userId, status: 'DRAFT', terms },
      update: { terms },
    });
    const due = new Date(booking.start_date);
    await tx.payment.create({ data: { bookingId: id, userId: booking.userId, amount, type: 'rent', method: 'simulation', status: 'PENDING', due_date: due } });
    await tx.invoice.create({ data: { bookingId: id, propertyId: booking.propertyId, userId: booking.userId, amount, status: 'PENDING', due_date: due } });
    await tx.notification.create({ data: { userId: booking.userId, type: 'BOOKING_CONFIRMED', title: 'Booking confirmed', message: `${booking.property.title} has been approved. Your agreement and payment are ready.` } });
    await tx.notification.create({ data: { userId: booking.property.ownerId, type: 'BOOKING_CONFIRMED', title: 'Booking approved', message: `The booking for ${booking.property.title} has been confirmed.` } });
    return updated;
  });
}

export async function cancelBooking(id: string) {
  return prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } });
}

export async function getMyBookings(userId: string) {
  return prisma.booking.findMany({ where: { userId }, include: { property: true } });
}

export async function checkOverlap(
  propertyId: string,
  startDate: string,
  endDate: string,
  excludeBookingId?: string,
): Promise<{ hasOverlap: boolean; overlapping: any[] }> {
  const overlaps = await prisma.booking.findMany({
    where: {
      propertyId,
      status: { notIn: ['CANCELLED'] },
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      OR: [
        {
          start_date: { lte: new Date(endDate) },
          end_date: { gte: new Date(startDate) },
        },
      ],
    },
    include: { user: { select: { id: true, full_name: true } } },
  });

  return { hasOverlap: overlaps.length > 0, overlapping: overlaps };
}

export async function getBookingSummary(): Promise<{ pending: number; confirmed: number; active: number; cancelled: number; total: number }> {
  const [pending, confirmed, active, cancelled] = await Promise.all([
    prisma.booking.count({ where: { status: 'PENDING' } }),
    prisma.booking.count({ where: { status: 'CONFIRMED' } }),
    prisma.booking.count({ where: { status: 'CHECKED_IN' } }),
    prisma.booking.count({ where: { status: 'CANCELLED' } }),
  ]);
  return { pending, confirmed, active, cancelled, total: pending + confirmed + active + cancelled };
}
