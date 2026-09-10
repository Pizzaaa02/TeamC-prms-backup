import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as bookingService from './service_booking';
import { successResponse, paginatedResponse } from '../../utils/response';
import { recordAudit } from '../admin/service_audit';

const HELPERS = (req: Request) => {
  const ip = (req as any).ip || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'];
  const url = req.originalUrl;
  const method = req.method;
  const auth = req as AuthRequest;
  const log = async (ctx: { action: string; entity: string; entityId?: string; description?: string; status?: string; level?: string; errorMessage?: string }) => {
    await recordAudit({ ...ctx, userId: auth.user?.id, username: auth.user?.email || undefined, userRole: auth.user?.role, ipAddress: ip, userAgent: ua, requestUrl: url, httpMethod: method, module: 'Booking', status: ctx.status || 'Success', level: ctx.level || 'info' });
  };
  return { log };
};

export class BookingController {
  list = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const { userId, status } = req.query;
      const { bookings, total } = await bookingService.getBookings(page, limit, userId as any, status as any);
      HELPERS(req).log({ action: 'VIEW_BOOKINGS', entity: 'Booking', description: `Listed bookings (page ${page})` });
      res.json(paginatedResponse(bookings, page, limit, total));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_BOOKINGS', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const booking = await bookingService.getBookingById(String(req.params.id));
      if (!booking) return res.status(404).json({ success: false, error: { message: 'Booking not found' } });
      HELPERS(req).log({ action: 'VIEW_BOOKING', entity: 'Booking', entityId: booking.id, description: `Viewed booking ${booking.id}` });
      res.json(successResponse(booking));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_BOOKING', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const booking = await bookingService.createBooking(req.body, req.user!.id);
      HELPERS(req).log({ action: 'CREATE_BOOKING', entity: 'Booking', entityId: booking.id, description: `Created booking for property ${booking.propertyId}` });
      res.status(201).json(successResponse(booking, 'Booking created'));
    } catch (error: any) { HELPERS(req).log({ action: 'CREATE_BOOKING', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const booking = await bookingService.updateBooking(String(req.params.id), req.body);
      HELPERS(req).log({ action: 'UPDATE_BOOKING', entity: 'Booking', entityId: booking?.id, description: `Updated booking ${req.params.id}` });
      res.json(successResponse(booking, 'Booking updated'));
    } catch (error: any) { HELPERS(req).log({ action: 'UPDATE_BOOKING', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  confirm = async (req: Request, res: Response) => {
    try {
      const booking = await bookingService.updateBooking(String(req.params.id), { status: 'CONFIRMED' });
      HELPERS(req).log({ action: 'CONFIRM_BOOKING', entity: 'Booking', entityId: req.params.id, description: `Confirmed booking ${req.params.id}` });
      res.json(successResponse(booking, 'Booking confirmed'));
    } catch (error: any) { HELPERS(req).log({ action: 'CONFIRM_BOOKING', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  reject = async (req: Request, res: Response) => {
    try {
      const booking = await bookingService.updateBooking(String(req.params.id), { status: 'CANCELLED' });
      HELPERS(req).log({ action: 'REJECT_BOOKING', entity: 'Booking', entityId: req.params.id, description: `Rejected booking ${req.params.id}` });
      res.json(successResponse(booking, 'Booking rejected'));
    } catch (error: any) { HELPERS(req).log({ action: 'REJECT_BOOKING', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  cancel = async (req: Request, res: Response) => {
    try {
      await bookingService.cancelBooking(String(req.params.id));
      HELPERS(req).log({ action: 'CANCEL_BOOKING', entity: 'Booking', entityId: req.params.id, description: `Cancelled booking ${req.params.id}` });
      res.json(successResponse(null, 'Booking cancelled'));
    } catch (error: any) { HELPERS(req).log({ action: 'CANCEL_BOOKING', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  getSummary = async (req: Request, res: Response) => {
    try {
      const summary = await bookingService.getBookingSummary();
      HELPERS(req).log({ action: 'VIEW_BOOKING_SUMMARY', entity: 'Booking', description: `Viewed booking summary` });
      res.json(successResponse(summary));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_BOOKING_SUMMARY', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  myBookings = async (req: AuthRequest, res: Response) => {
    try {
      const bookings = await bookingService.getMyBookings(req.user!.id);
      HELPERS(req).log({ action: 'VIEW_MY_BOOKINGS', entity: 'Booking', description: `Viewed own bookings` });
      res.json(successResponse(bookings));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_MY_BOOKINGS', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  landlordBookings = async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string | undefined;
      const { bookings, total } = await bookingService.getLandlordBookings(req.user!.id, page, limit, status);
      HELPERS(req).log({ action: 'VIEW_LANDLORD_BOOKINGS', entity: 'Booking', description: 'Viewed bookings on own properties' });
      res.json(paginatedResponse(bookings, page, limit, total));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_LANDLORD_BOOKINGS', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  agentBookings = async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string | undefined;
      const { bookings, total } = await bookingService.getAgentBookings(req.user!.id, page, limit, status);
      HELPERS(req).log({ action: 'VIEW_ASSIGNED_BOOKINGS', entity: 'Booking', description: 'Viewed bookings for assigned properties' });
      res.json(paginatedResponse(bookings, page, limit, total));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_ASSIGNED_BOOKINGS', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  checkOverlap = async (req: Request, res: Response) => {
    try {
      const { propertyId, startDate, endDate, excludeBookingId } = req.query;
      if (!propertyId || !startDate || !endDate || isNaN(Date.parse(String(startDate))) || isNaN(Date.parse(String(endDate)))) {
        return res.status(400).json({ success: false, error: { message: 'propertyId, startDate and endDate are required' } });
      }
      const result = await bookingService.checkOverlap(
        String(propertyId),
        String(startDate),
        String(endDate),
        excludeBookingId ? String(excludeBookingId) : undefined,
      );
      HELPERS(req).log({ action: 'CHECK_OVERLAP', entity: 'Booking', description: `Checked overlap for property ${propertyId}` });
      res.json(successResponse(result));
    } catch (error: any) { HELPERS(req).log({ action: 'CHECK_OVERLAP', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };
}
