import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as service from './service_payment';
import { successResponse, paginatedResponse } from '../../utils/response';
import { recordAudit } from '../admin/service_audit';

async function audit(req: AuthRequest, action: string, error?: unknown) {
  await recordAudit({ userId: req.user!.id, userRole: req.user!.role, module: 'Payment', action,
    entity: 'Payment', entityId: req.params.id ? String(req.params.id) : undefined,
    status: error ? 'Failed' : 'Success', level: error ? 'error' : 'info',
    errorMessage: error instanceof Error ? error.message : undefined, ipAddress: req.ip,
    userAgent: req.headers['user-agent'], requestUrl: req.originalUrl, httpMethod: req.method });
}
async function run(req: AuthRequest, res: Response, action: string, work: () => Promise<unknown>) {
  try {
    const result = await work();
    await audit(req, action);
    res.json(result);
  } catch (error) {
    await audit(req, action, error);
    res.status(error instanceof service.PaymentError ? error.statusCode : 500).json({
      success: false, error: { message: error instanceof service.PaymentError ? error.message : 'Payment request failed. Please retry.' },
    });
  }
}
export class PaymentController {
  list = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const auth = req as AuthRequest;
      const { payments, total } = await paymentService.getPayments(page, limit, auth.user!);
      HELPERS(req).log({ action: 'VIEW_PAYMENTS', entity: 'Payment', description: `Listed payments (page ${page})` });
      res.json(paginatedResponse(payments, page, limit, total));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_PAYMENTS', entity: 'Payment', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const payment = await paymentService.getPaymentById(String(req.params.id));
      if (!payment) return res.status(404).json({ success: false, error: { message: 'Payment not found' } });
      const auth = req as AuthRequest;
      if (auth.user!.role === 'Tenant' && payment.userId !== auth.user!.id) return res.status(403).json({ success: false, error: { message: 'Access denied' } });
      HELPERS(req).log({ action: 'VIEW_PAYMENT', entity: 'Payment', entityId: payment.id, description: `Viewed payment` });
      res.json(successResponse(payment));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_PAYMENT', entity: 'Payment', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const payment = await paymentService.createPayment({ ...req.body, userId: req.user!.id });
      HELPERS(req).log({ action: 'CREATE_PAYMENT', entity: 'Payment', entityId: payment.id, description: `Created payment of amount ${(req.body as any).amount}` });
      res.status(201).json(successResponse(payment, 'Payment recorded'));
    } catch (error: any) { HELPERS(req).log({ action: 'CREATE_PAYMENT', entity: 'Payment', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  markPaid = async (req: Request, res: Response) => {
    try {
      const payment = await paymentService.markAsPaid(String(req.params.id));
      HELPERS(req).log({ action: 'MARK_PAYMENT_PAID', entity: 'Payment', entityId: String(req.params.id), description: `Payment marked as paid` });
      res.json(successResponse(payment, 'Payment marked as paid'));
    } catch (error: any) { HELPERS(req).log({ action: 'MARK_PAYMENT_PAID', entity: 'Payment', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  simulate = async (req: AuthRequest, res: Response) => {
    try {
      const payment = await paymentService.simulatePayment(String(req.params.id), req.user!.id);
      HELPERS(req).log({ action: 'SIMULATE_PAYMENT', entity: 'Payment', entityId: payment.id, description: 'Completed sandbox payment' });
      res.json(successResponse(payment, 'Sandbox payment successful'));
    } catch (error: any) { res.status(error.message === 'Access denied' ? 403 : 400).json({ success: false, error: { message: error.message } }); }
  };

  summary = async (req: AuthRequest, res: Response) => {
    try {
      const summary = await paymentService.getFinanceSummary(req.user!.id);
      HELPERS(req).log({ action: 'VIEW_PAYMENT_SUMMARY', entity: 'Payment', description: `Viewed financial summary` });
      res.json(successResponse(summary));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_PAYMENT_SUMMARY', entity: 'Payment', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };
}
