import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as reportingService from './service_reporting';
import { successResponse } from '../../utils/response';

export class ReportingController {
  exportCsv = async (req: AuthRequest, res: Response) => {
    try {
      const report = await reportingService.getRevenueReport(req.query.month as any, req.query.year as any, req.user!);
      const rows = report.payments.map((payment) => ({ paidAt: payment.paid_at, type: payment.type, amountMYR: payment.amount }));
      const columns = ['paidAt', 'type', 'amountMYR'];
      const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const csv = [columns.map(escape).join(','), ...rows.map((row: any) => columns.map((key) => escape(typeof row[key] === 'object' ? JSON.stringify(row[key]) : row[key])).join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="prms-revenue-report.csv"');
      res.send(`\uFEFF${csv}`);
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };
  dashboard = async (req: AuthRequest, res: Response) => {
    try {
      const stats = await reportingService.getDashboardStats(req.user!);
      res.json(successResponse(stats));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  revenue = async (req: AuthRequest, res: Response) => {
    try {
      const report = await reportingService.getRevenueReport(req.query.month as any, req.query.year as any, req.user!);
      res.json(successResponse(report));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  properties = async (req: AuthRequest, res: Response) => {
    try {
      const report = await reportingService.getPropertyReport(req.user!);
      res.json(successResponse(report));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  occupancy = async (req: AuthRequest, res: Response) => {
    try {
      const report = await reportingService.getOccupancyReport(req.user!);
      res.json(successResponse(report));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };
}
