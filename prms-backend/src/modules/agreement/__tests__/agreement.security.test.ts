import * as service from '../service_agreement';

const findMany = jest.fn();
const findFirst = jest.fn();
const update = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    rentalAgreement: {
      findMany: (...args: any[]) => findMany(...args),
      findFirst: (...args: any[]) => findFirst(...args),
      update: (...args: any[]) => update(...args),
    },
  },
}));

const draft = (overrides = {}) => ({
  id: 'agreement-1',
  tenantId: 'tenant-1',
  status: 'DRAFT',
  tenantSignature: null,
  landlordSignature: null,
  booking: { status: 'CONFIRMED' },
  property: { ownerId: 'landlord-1' },
  ...overrides,
});

beforeEach(() => {
  jest.resetAllMocks();
  findMany.mockResolvedValue([]);
  findFirst.mockResolvedValue(draft());
  update.mockImplementation(async ({ data }: any) => ({ ...draft(), ...data }));
});

describe('agreement role scope', () => {
  test('tenant sees only their agreements', async () => {
    await service.getAgreements({ id: 'tenant-1', role: 'Tenant' });
    expect(findMany.mock.calls[0][0].where).toEqual({ tenantId: 'tenant-1' });
  });

  test('landlord sees only agreements for owned properties', async () => {
    await service.getAgreements({ id: 'landlord-1', role: 'Landlord' });
    expect(findMany.mock.calls[0][0].where).toEqual({ property: { ownerId: 'landlord-1' } });
  });

  test('agent receives no agreement scope', async () => {
    await service.getAgreement('agreement-1', { id: 'agent-1', role: 'Agent' });
    expect(findFirst.mock.calls[0][0].where).toEqual({ id: '__not_authorized__' });
  });
});

describe('two-party signing', () => {
  test('allows the missing landlord signature on a legacy active record', async () => {
    findFirst.mockResolvedValue(draft({ status: 'ACTIVE', tenantSignature: 'Jane Tenant' }));
    await service.signAgreement('agreement-1', { id: 'landlord-1', role: 'Landlord' }, 'John Landlord');
    expect(update.mock.calls[0][0].data).toEqual(expect.objectContaining({ landlordSignature: 'John Landlord', status: 'ACTIVE' }));
    expect(update.mock.calls[0][0].data).not.toHaveProperty('tenantSignature');
  });
  test('first signature keeps the agreement in draft', async () => {
    findFirst.mockResolvedValue(draft());
    await service.signAgreement('agreement-1', { id: 'landlord-1', role: 'Landlord' }, 'John Landlord');
    expect(update.mock.calls[0][0].data).toEqual({ landlordSignature: 'John Landlord' });
  });

  test('second signature activates the agreement', async () => {
    findFirst.mockResolvedValue(draft({ landlordSignature: 'John Landlord' }));
    await service.signAgreement('agreement-1', { id: 'tenant-1', role: 'Tenant' }, 'Jane Tenant');
    expect(update.mock.calls[0][0].data).toEqual(expect.objectContaining({ tenantSignature: 'Jane Tenant', status: 'ACTIVE', accepted_at: expect.any(Date) }));
  });

  test('admin and agent cannot sign', async () => {
    await expect(service.signAgreement('agreement-1', { id: 'admin-1', role: 'Admin' }, 'System Admin')).rejects.toMatchObject({ statusCode: 403 });
    await expect(service.signAgreement('agreement-1', { id: 'agent-1', role: 'Agent' }, 'Amy Agent')).rejects.toMatchObject({ statusCode: 403 });
  });

  test('cannot overwrite a recorded signature', async () => {
    findFirst.mockResolvedValue(draft({ tenantSignature: 'Jane Tenant' }));
    await expect(service.signAgreement('agreement-1', { id: 'tenant-1', role: 'Tenant' }, 'Another Name')).rejects.toThrow('already signed');
    expect(update).not.toHaveBeenCalled();
  });

  test.each(['', 'A', 'x'.repeat(121), 'Bad\nName'])('rejects an invalid legal name', async (signature) => {
    await expect(service.signAgreement('agreement-1', { id: 'tenant-1', role: 'Tenant' }, signature)).rejects.toThrow('valid full legal name');
  });

  test('cannot sign an agreement for a cancelled booking', async () => {
    findFirst.mockResolvedValue(draft({ booking: { status: 'CANCELLED' } }));
    await expect(service.signAgreement('agreement-1', { id: 'tenant-1', role: 'Tenant' }, 'Jane Tenant')).rejects.toThrow('no longer awaiting');
  });
});
