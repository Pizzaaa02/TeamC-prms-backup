import { prisma } from '../../db';

export async function sendMessage(data: { receiverId: string; content: string; conversationId: string }, senderId: string) {
  return prisma.message.create({
    data: { ...data, senderId, isRead: false },
    include: { sender: { select: { id: true, full_name: true } }, receiver: { select: { id: true, full_name: true } } },
  });
}

export async function getConversations(userId: string) {
  const conversations = await prisma.message.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    orderBy: { id: 'desc' },
    include: { sender: { select: { id: true, full_name: true } }, receiver: { select: { id: true, full_name: true } } },
  });
  return conversations;
}

export async function getMessagesByConversation(conversationId: string, userId: string) {
  return prisma.message.findMany({
    where: { conversationId, OR: [{ senderId: userId }, { receiverId: userId }] },
    orderBy: { created_at: 'asc' },
    include: { sender: { select: { id: true, full_name: true } } },
  });
}

export async function markAsRead(messageId: string, userId: string) {
  const message = await prisma.message.findFirst({ where: { id: messageId, receiverId: userId } });
  if (!message) throw new Error('Message not found');
  return prisma.message.update({ where: { id: messageId }, data: { isRead: true } });
}
