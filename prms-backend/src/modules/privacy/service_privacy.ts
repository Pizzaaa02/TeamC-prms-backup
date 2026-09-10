import { prisma } from '../../db';

export const NOTICE_VERSION = '2026-09-03';

export async function recordConsent(userId: string, input: { purpose: string; granted: boolean }, context: { ipAddress?: string; userAgent?: string }) {
  return prisma.privacyConsent.create({
    data: { userId, purpose: input.purpose, granted: input.granted, noticeVersion: NOTICE_VERSION, ...context },
  });
}

export async function consentHistory(userId: string) {
  return prisma.privacyConsent.findMany({ where: { userId }, orderBy: { created_at: 'desc' } });
}

export async function exportPersonalData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, full_name: true, phone: true, profile_img_url: true, created_at: true, updated_at: true,
      UserRole: { select: { role: { select: { name: true } } } },
      bookings: true, payments: true, tickets: true, sentMessages: true, receivedMessages: true,
      notifications: true, favorites: true, preferences: true, uploadedFiles: true,
      privacyConsents: true, dataRequests: true,
    },
  });
  if (!user) throw new Error('User not found');
  return { exportedAt: new Date().toISOString(), noticeVersion: NOTICE_VERSION, user };
}

export async function createDataRequest(userId: string, type: any, details?: string) {
  return prisma.dataSubjectRequest.create({ data: { userId, type, details } });
}

export async function listMyRequests(userId: string) {
  return prisma.dataSubjectRequest.findMany({ where: { userId }, orderBy: { created_at: 'desc' } });
}

export async function listAllRequests() {
  return prisma.dataSubjectRequest.findMany({ include: { user: { select: { email: true, full_name: true } } }, orderBy: { created_at: 'desc' } });
}

export async function updateRequest(id: string, status: any, response?: string) {
  return prisma.dataSubjectRequest.update({
    where: { id }, data: { status, response, completed_at: status === 'COMPLETED' ? new Date() : null },
  });
}

export async function listBreaches() {
  return prisma.dataBreachIncident.findMany({ orderBy: { detected_at: 'desc' } });
}

export async function createBreach(data: any) {
  return prisma.dataBreachIncident.create({ data: { ...data, detected_at: data.detected_at ? new Date(data.detected_at) : new Date() } });
}

export async function runRetentionCleanup(notificationDays = 365, auditDays = 730) {
  const notificationCutoff = new Date(Date.now() - notificationDays * 86400000);
  const auditCutoff = new Date(Date.now() - auditDays * 86400000);
  const [notifications, auditLogs] = await prisma.$transaction([
    prisma.notification.deleteMany({ where: { created_at: { lt: notificationCutoff } } }),
    prisma.auditLog.deleteMany({ where: { created_at: { lt: auditCutoff } } }),
  ]);
  return { notificationsDeleted: notifications.count, auditLogsDeleted: auditLogs.count };
}
