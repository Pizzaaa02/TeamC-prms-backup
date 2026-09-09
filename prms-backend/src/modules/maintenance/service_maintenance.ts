import { prisma } from '../../db';

export async function getTickets(page = 1, limit = 10, userId?: string, status?: string, actor?: { id: string; role: string }) {
  const where: any = {};
  if (userId) where.userId = userId;
  if (status) where.status = status;
  if (actor?.role === 'Landlord') where.property = { ownerId: actor.id };
  if (actor?.role === 'Agent') where.property = { agentProperties: { some: { agent: { userId: actor.id } } } };
  const [tickets, total] = await Promise.all([
    prisma.maintenanceTicket.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { id: 'desc' }, include: { user: { select: { id: true, full_name: true, email: true } }, property: true } }),
    prisma.maintenanceTicket.count({ where }),
  ]);
  return { tickets, total };
}

export async function getTicketById(id: string) {
  return prisma.maintenanceTicket.findUnique({ where: { id }, include: { user: true, property: true } });
}

export async function getMyTickets(userId: string) {
  return prisma.maintenanceTicket.findMany({ where: { userId }, include: { property: true }, orderBy: { created_at: 'desc' } });
}

export async function createTicket(data: { title: string; description: string; propertyId?: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; }, userId: string) {
  return prisma.maintenanceTicket.create({
    data: {
      title: data.title,
      description: data.description,
      priority: data.priority,
      user: { connect: { id: userId } },
      ...(data.propertyId ? { property: { connect: { id: data.propertyId } } } : {}),
    },
    include: { user: true },
  });
}

export async function updateTicket(id: string, data: { status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'; assignedTo?: string; }) {
  return prisma.maintenanceTicket.update({
    where: { id }, data,
    include: { user: true },
  });
}

export async function resolveTicket(id: string) {
  return prisma.maintenanceTicket.update({
    where: { id }, data: { status: 'RESOLVED', resolved_at: new Date() },
  });
}
