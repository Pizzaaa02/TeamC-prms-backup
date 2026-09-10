import { prisma } from '../../db';

export async function getDashboardStats(actor?: { id: string; role: string }) {
  const propertyWhere = actor?.role === 'Landlord' ? { ownerId: actor.id } : {};
  const bookingWhere = actor?.role === 'Landlord' ? { property: { ownerId: actor.id } } : {};
  const paymentWhere: any = actor?.role === 'Landlord' ? { status: 'PAID', booking: { property: { ownerId: actor.id } } } : { status: 'PAID' };
  const [totalUsers, totalProperties, totalBookings, totalRevenue] = await Promise.all([
    actor?.role === 'Landlord' ? Promise.resolve(0) : prisma.user.count(),
    prisma.property.count({ where: propertyWhere }),
    prisma.booking.count({ where: bookingWhere }),
    prisma.payment.aggregate({ where: paymentWhere, _sum: { amount: true } }),
  ]);
  
  return {
    totalUsers,
    totalProperties,
    totalBookings,
    totalRevenue: totalRevenue._sum?.amount || 0,
  };
}

export async function getRevenueReport(month?: string, year?: string, actor?: { id: string; role: string }) {
  const where: any = { status: 'PAID' };
  if (actor?.role === 'Landlord') where.booking = { property: { ownerId: actor.id } };
  if (month && year) {
    const start = new Date(`${year}-${month}-01`);
    const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    where.paid_at = { gte: start, lte: end };
  }
  
  const payments = await prisma.payment.findMany({
    where,
    select: { amount: true, paid_at: true, type: true },
    orderBy: { paid_at: 'desc' },
  });
  
  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  return { payments, total, count: payments.length };
}

export async function getPropertyReport(actor?: { id: string; role: string }) {
  const properties = await prisma.property.findMany({
    where: actor?.role === 'Landlord' ? { ownerId: actor.id } : {},
    include: {
      _count: { select: { bookings: true } },
    },
  });
  
  return properties.map(p => ({
    id: p.id,
    title: p.title,
    status: p.status,
    rent: p.rent,
    bookingCount: p._count.bookings,
  }));
}

export async function getOccupancyReport(actor?: { id: string; role: string }) {
  const owner = actor?.role === 'Landlord' ? { ownerId: actor.id } : {};
  const totalProperties = await prisma.property.count({ where: owner });
  const activeBookings = await prisma.booking.count({ where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] }, ...(actor?.role === 'Landlord' ? { property: owner } : {}) } });
  
  return {
    totalProperties,
    activeBookings,
    occupancyRate: totalProperties > 0 ? Math.round((activeBookings / totalProperties) * 100) : 0,
  };
}
