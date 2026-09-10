import { prisma } from '../../db';

export type AgreementActor = { id: string; role: string };

export class AgreementError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message);
    this.name = 'AgreementError';
  }
}

const includeAgreement = {
  property: true,
  booking: true,
  tenant: { select: { id: true, full_name: true, email: true } },
} as const;

function actorWhere(actor: AgreementActor): any {
  if (actor.role === 'Admin') return {};
  if (actor.role === 'Tenant') return { tenantId: actor.id };
  if (actor.role === 'Landlord') return { property: { ownerId: actor.id } };
  return { id: '__not_authorized__' };
}

export async function getAgreements(actor: AgreementActor) {
  return prisma.rentalAgreement.findMany({
    where: actorWhere(actor),
    include: includeAgreement,
    orderBy: { generated_at: 'desc' },
  });
}

export async function getMyAgreements(userId: string) {
  return getAgreements({ id: userId, role: 'Tenant' });
}

export async function getAgreement(id: string, actor: AgreementActor) {
  return prisma.rentalAgreement.findFirst({
    where: { id, ...actorWhere(actor) },
    include: includeAgreement,
  });
}

function validateSignature(value: unknown) {
  if (typeof value !== 'string') throw new AgreementError('Full legal name is required');
  if (/[\u0000-\u001F\u007F]/.test(value)) throw new AgreementError('Enter a valid full legal name between 2 and 120 characters');
  const signature = value.trim().replace(/\s+/g, ' ');
  if (signature.length < 2 || signature.length > 120) {
    throw new AgreementError('Enter a valid full legal name between 2 and 120 characters');
  }
  return signature;
}

export async function signAgreement(id: string, actor: AgreementActor, signatureValue: unknown) {
  if (!['Tenant', 'Landlord'].includes(actor.role)) throw new AgreementError('Only the tenant or property landlord may sign this agreement', 403);
  const signature = validateSignature(signatureValue);
  const agreement = await getAgreement(id, actor);
  if (!agreement) throw new AgreementError('Agreement not found', 404);
  const incompleteLegacy = agreement.status === 'ACTIVE' && (!agreement.tenantSignature || !agreement.landlordSignature);
  if (agreement.status !== 'DRAFT' && !incompleteLegacy) throw new AgreementError('Only agreements awaiting signatures can be signed');
  if (agreement.booking.status !== 'CONFIRMED') throw new AgreementError('The related booking is no longer awaiting agreement completion');

  if (actor.role === 'Tenant' && agreement.tenantSignature) throw new AgreementError('The tenant has already signed this agreement');
  if (actor.role === 'Landlord' && agreement.landlordSignature) throw new AgreementError('The landlord has already signed this agreement');

  const bothSigned = actor.role === 'Tenant' ? Boolean(agreement.landlordSignature) : Boolean(agreement.tenantSignature);
  const data = actor.role === 'Tenant'
    ? { tenantSignature: signature, ...(bothSigned ? { status: 'ACTIVE' as const, accepted_at: new Date() } : {}) }
    : { landlordSignature: signature, ...(bothSigned ? { status: 'ACTIVE' as const, accepted_at: new Date() } : {}) };

  return prisma.rentalAgreement.update({ where: { id }, data, include: includeAgreement });
}

export async function acceptAgreement(id: string, userId: string, signature: string) {
  return signAgreement(id, { id: userId, role: 'Tenant' }, signature);
}
