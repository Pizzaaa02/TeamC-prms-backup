import * as service from '../service_booking';

const findMany = jest.fn();
const findFirst = jest.fn();
const findUnique = jest.fn();
const count = jest.fn();
const create = jest.fn();
const update = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    booking: {
      findMany: (...args: any[]) => findMany(...args),
      findFirst: (...args: any[]) => findFirst(...args),
      count: (...args: any[]) => count(...args),
      create: (...args: any[]) => create(...args),
      update: (...args: any[]) => update(...args),
    },
    property: { findUnique: (...args: any[]) => findUnique(...args) },
  },
}));

const future = (days: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

beforeEach(() => {
  jest.clearAllMocks();
  findMany.mockResolvedValue([]);
  count.mockResolvedValue(0);
  create.mockResolvedValue({ id: 'new-booking' });
  update.mockImplementation(async ({ data }: any) => ({ id: 'booking-1', ...data }));
});

describe('booking role and ownership scope', () => {
  test('tenant lists only their own bookings', async () => {
    await service.getBookings({ id: 'tenant-1', role: 'Tenant' });
    expect(findMany.mock.calls[0][0].where).toEqual({ userId: 'tenant-1' });
    expect(count.mock.calls[0][0].where).toEqual({ userId: 'tenant-1' });
  });

  test('landlord lists only bookings on owned properties', async () => {
    await service.getBookings({ id: 'landlord-1', role: 'Landlord' });
    expect(findMany.mock.calls[0][0].where).toEqual({ property: { ownerId: 'landlord-1' } });
  });

  test('agent receives read-only scope for assigned properties', async () => {
    await service.getBookingById('booking-1', { id: 'agent-1', role: 'Agent' });
    expect(findFirst.mock.calls[0][0].where).toEqual({
      id: 'booking-1',
      property: { agentProperties: { some: { agent: { userId: 'agent-1' } } } },
    });
  });

  test('unauthorised booking IDs return not found and cannot be cancelled', async () => {
    findFirst.mockResolvedValue(null);
    await expect(service.cancelBooking('other-booking', { id: 'tenant-1', role: 'Tenant' }))
      .rejects.toMatchObject({ message: 'Booking not found', statusCode: 404 });
    expect(update).not.toHaveBeenCalled();
  });

  test('agents cannot cancel an assigned booking', async () => {
    findFirst.mockResolvedValue({ id: 'booking-1', status: 'PENDING' });
    await expect(service.cancelBooking('booking-1', { id: 'agent-1', role: 'Agent' }))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(update).not.toHaveBeenCalled();
  });
});

describe('booking date and privacy safeguards', () => {
  test('rejects malformed, past and reversed date ranges', async () => {
    await expect(service.createBooking({ propertyId: 'p1', start_date: 'tomorrow', end_date: future(2) }, 'tenant-1')).rejects.toThrow('YYYY-MM-DD');
    await expect(service.createBooking({ propertyId: 'p1', start_date: '2020-01-01', end_date: '2020-01-02' }, 'tenant-1')).rejects.toThrow('past');
    await expect(service.createBooking({ propertyId: 'p1', start_date: future(3), end_date: future(2) }, 'tenant-1')).rejects.toThrow('after');
    expect(create).not.toHaveBeenCalled();
  });

  test('server calculates amount from the property and ignores client values', async () => {
    findUnique.mockResolvedValue({ id: 'p1', status: 'AVAILABLE', rent: 1750, availableFrom: null, availableTo: null });
    await service.createBooking({ propertyId: 'p1', start_date: future(2), end_date: future(3), totalAmount: 1 } as any, 'tenant-1');
    expect(create.mock.calls[0][0].data).toEqual(expect.objectContaining({ userId: 'tenant-1', totalAmount: 1750 }));
  });

  test('overlap response discloses counts only and allows adjacent dates', async () => {
    count.mockResolvedValue(1);
    const result = await service.checkOverlap('p1', future(2), future(3));
    expect(result).toEqual({ hasOverlap: true, conflictCount: 1 });
    expect(result).not.toHaveProperty('conflictingBookings');
    expect(count.mock.calls[0][0].where).toEqual(expect.objectContaining({
      start_date: { lt: new Date(`${future(3)}T00:00:00.000Z`) },
      end_date: { gt: new Date(`${future(2)}T00:00:00.000Z`) },
    }));
  });
});

describe('booking lifecycle', () => {
  test('tenant may withdraw only a pending request', async () => {
    findFirst.mockResolvedValue({ id: 'booking-1', status: 'CONFIRMED' });
    await expect(service.cancelBooking('booking-1', { id: 'tenant-1', role: 'Tenant' }))
      .rejects.toThrow('Only pending bookings');
  });

  test('status cannot skip from confirmed directly to checked out', async () => {
    findFirst.mockResolvedValue({ id: 'booking-1', status: 'CONFIRMED' });
    await expect(service.updateBooking('booking-1', { status: 'CHECKED_OUT' }, { id: 'landlord-1', role: 'Landlord' }))
      .rejects.toThrow('Cannot change booking');
  });
});
