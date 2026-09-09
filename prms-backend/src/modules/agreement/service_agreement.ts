import { prisma } from '../../db';

export async function getMyAgreements(userId: string) {
  return prisma.rentalAgreement.findMany({ where: { tenantId: userId }, include: { property: true, booking: true }, orderBy: { generated_at: 'desc' } });
}

export async function getAgreement(id: string, userId: string, role: string) {
  const agreement = await prisma.rentalAgreement.findUnique({ where: { id }, include: { property: true, booking: true, tenant: { select: { full_name: true, email: true } } } });
  if (!agreement) return null;
  if (role === 'Tenant' && agreement.tenantId !== userId) return null;
  if (role === 'Landlord' && agreement.property.ownerId !== userId) return null;
  return agreement;
}

export async function acceptAgreement(id: string, userId: string, signature: string) {
  const agreement = await prisma.rentalAgreement.findUnique({ where: { id } });
  if (!agreement || agreement.tenantId !== userId) throw new Error('Agreement not found');
  return prisma.rentalAgreement.update({ where: { id }, data: { tenantSignature: signature, accepted_at: new Date(), status: 'ACTIVE' } });
}
