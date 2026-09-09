import { prisma } from '../../db';

export async function getNotifications(userId: string | undefined, isRead?: boolean, _archived?: boolean) {
  const where: any = { userId };
  if (isRead !== undefined) where.isRead = isRead;
  return prisma.notification.findMany({
    where,
    orderBy: { created_at: 'desc' },
  });
}

export async function markRead(id: string, userId: string) {
  const item = await prisma.notification.findFirst({ where: { id, userId } });
  if (!item) throw new Error('Notification not found');
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

export async function deleteNotification(id: string, userId: string) {
  const item = await prisma.notification.findFirst({ where: { id, userId } });
  if (!item) throw new Error('Notification not found');
  return prisma.notification.delete({ where: { id } });
}

export async function createNotification(userId: string, data: { title: string; message: string; type: string; }) {
  return prisma.notification.create({
    data: {
      userId,
      title: data.title,
      message: data.message,
      type: data.type,
      isRead: false,
    },
  });
}
