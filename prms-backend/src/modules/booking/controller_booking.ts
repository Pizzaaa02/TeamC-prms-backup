import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as bookingService from './service_booking';
import { successResponse, paginatedResponse } from '../../utils/response';
import { recordAudit } from '../admin/service_audit';

const HELPERS = (req: Request) => {
  const auth = req as AuthRequest;
  const log = async (ctx: { action: string; entity: string; entityId?: string; description?: string; status?: string; level?: string; errorMessage?: string }) => {
    await recordAudit({
      ...ctx,
      userId: auth.user?.id,
      username: auth.user?.email || undefined,
      userRole: auth.user?.role,
      ipAddress: (req as any).ip || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'],
      requestUrl: req.originalUrl,
      httpMethod: req.method,
      module: 'Booking',
      status: ctx.status || 'Success',
      level: ctx.level || 'info',
    });
  };
  return { log };
};

function actor(req: AuthRequest): bookingService.BookingActor {
  return { id: req.user!.id, role: req.user!.role };
}

async function fail(req: Request, res: Response, action: string, error: any, fallbackStatus = 500) {
  try {
    await HELPERS(req).log({ action, entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message });
  } catch {
    // Audit logging must not replace the original API error.
  }
  const status = error instanceof bookingService.BookingError ? error.statusCode : fallbackStatus;
  return res.status(status).json({ success: false, error: { message: error.message || 'Booking request failed' } });
}

export class BookingController {
  list = async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const { userId, status } = req.query;
      const result = await bookingService.getBookings(actor(req), page, limit, userId as string | undefined, status as string | undefined);
      await HELPERS(req).log({ action: 'VIEW_BOOKINGS', entity: 'Booking', description: `Listed bookings (page ${result.page})` });
      res.json(paginatedResponse(result.bookings, result.page, result.limit, result.total));
    } catch (error: any) { return fail(req, res, 'VIEW_BOOKINGS', error); }
  };

  getById = async (req: AuthRequest, res: Response) => {
    try {
      const booking = await bookingService.getBookingById(String(req.params.id), actor(req));
      if (!booking) throw new bookingService.BookingError('Booking not found', 404);
      await HELPERS(req).log({ action: 'VIEW_BOOKING', entity: 'Booking', entityId: booking.id, description: `Viewed booking ${booking.id}` });
      res.json(successResponse(booking));
    } catch (error: any) { return fail(req, res, 'VIEW_BOOKING', error); }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const booking = await bookingService.createBooking(req.body, req.user!.id);
      await HELPERS(req).log({ action: 'CREATE_BOOKING', entity: 'Booking', entityId: booking.id, description: `Created booking for property ${booking.propertyId}` });
      res.status(201).json(successResponse(booking, 'Booking created'));
    } catch (error: any) { return fail(req, res, 'CREATE_BOOKING', error, 400); }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const booking = await bookingService.updateBooking(String(req.params.id), req.body, actor(req));
      await HELPERS(req).log({ action: 'UPDATE_BOOKING', entity: 'Booking', entityId: booking.id, description: `Updated booking ${booking.id}` });
      res.json(successResponse(booking, 'Booking updated'));
    } catch (error: any) { return fail(req, res, 'UPDATE_BOOKING', error, 400); }
  };

  confirm = async (req: AuthRequest, res: Response) => {
    try {
      const booking = await bookingService.confirmBooking(String(req.params.id), actor(req));
      await HELPERS(req).log({ action: 'CONFIRM_BOOKING', entity: 'Booking', entityId: booking.id, description: `Confirmed booking ${booking.id}` });
      res.json(successResponse(booking, 'Booking confirmed'));
    } catch (error: any) { return fail(req, res, 'CONFIRM_BOOKING', error, 400); }
  };

  reject = async (req: AuthRequest, res: Response) => {
    try {
      const booking = await bookingService.rejectBooking(String(req.params.id), actor(req));
      await HELPERS(req).log({ action: 'REJECT_BOOKING', entity: 'Booking', entityId: booking.id, description: `Rejected booking ${booking.id}` });
      res.json(successResponse(booking, 'Booking rejected'));
    } catch (error: any) { return fail(req, res, 'REJECT_BOOKING', error, 400); }
  };

  cancel = async (req: AuthRequest, res: Response) => {
    try {
      const booking = await bookingService.cancelBooking(String(req.params.id), actor(req));
      await HELPERS(req).log({ action: 'CANCEL_BOOKING', entity: 'Booking', entityId: booking.id, description: `Cancelled booking ${booking.id}` });
      res.json(successResponse(booking, 'Booking cancelled'));
    } catch (error: any) { return fail(req, res, 'CANCEL_BOOKING', error, 400); }
  };

  getSummary = async (req: AuthRequest, res: Response) => {
    try {
      const summary = await bookingService.getBookingSummary(actor(req));
      await HELPERS(req).log({ action: 'VIEW_BOOKING_SUMMARY', entity: 'Booking', description: 'Viewed booking summary' });
      res.json(successResponse(summary));
    } catch (error: any) { return fail(req, res, 'VIEW_BOOKING_SUMMARY', error); }
  };

  myBookings = async (req: AuthRequest, res: Response) => {
    try {
      const bookings = await bookingService.getMyBookings(req.user!.id);
      await HELPERS(req).log({ action: 'VIEW_MY_BOOKINGS', entity: 'Booking', description: 'Viewed own bookings' });
      res.json(successResponse(bookings));
    } catch (error: any) { return fail(req, res, 'VIEW_MY_BOOKINGS', error); }
  };

  checkOverlap = async (req: AuthRequest, res: Response) => {
    try {
      const { propertyId, startDate, endDate } = req.query;
      if (!propertyId) throw new bookingService.BookingError('Property is required');
      const result = await bookingService.checkOverlap(String(propertyId), String(startDate), String(endDate));
      await HELPERS(req).log({ action: 'CHECK_OVERLAP', entity: 'Booking', description: `Checked overlap for property ${propertyId}` });
      res.json(successResponse(result));
    } catch (error: any) { return fail(req, res, 'CHECK_OVERLAP', error, 400); }
  };
}
