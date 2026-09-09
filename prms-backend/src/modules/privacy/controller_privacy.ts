import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as service from './service_privacy';
import { successResponse } from '../../utils/response';

const allowedRequests = new Set(['ACCESS', 'CORRECTION', 'WITHDRAW_CONSENT', 'ERASURE', 'RESTRICT_PROCESSING', 'OBJECT_DIRECT_MARKETING']);

export class PrivacyController {
  notice = async (_req: AuthRequest, res: Response) => res.json(successResponse({
    version: service.NOTICE_VERSION,
    controller: 'Property Rental Management System (PRMS)',
    purposes: ['account and identity management', 'property rental and booking services', 'payments and receipts', 'maintenance and support', 'security, audit and legal compliance'],
    disclosures: ['service providers required to operate PRMS', 'property parties involved in an authorised rental workflow', 'regulators or law enforcement where legally required'],
    retention: { notificationsDays: 365, auditLogsDays: 730, accountData: 'for the account lifetime and required legal retention period' },
    rights: ['access', 'correction', 'withdraw consent', 'erasure request', 'restrict processing', 'object to direct marketing'],
    contact: 'privacy@prms.local',
  }));

  consent = async (req: AuthRequest, res: Response) => {
    const { purpose, granted } = req.body;
    if (!purpose || typeof granted !== 'boolean') return res.status(400).json({ success: false, error: { message: 'purpose and granted are required' } });
    const data = await service.recordConsent(req.user!.id, { purpose, granted }, { ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    res.status(201).json(successResponse(data, 'Consent preference recorded'));
  };
  history = async (req: AuthRequest, res: Response) => res.json(successResponse(await service.consentHistory(req.user!.id)));
  export = async (req: AuthRequest, res: Response) => res.json(successResponse(await service.exportPersonalData(req.user!.id)));
  createRequest = async (req: AuthRequest, res: Response) => {
    if (!allowedRequests.has(req.body.type)) return res.status(400).json({ success: false, error: { message: 'Invalid request type' } });
    res.status(201).json(successResponse(await service.createDataRequest(req.user!.id, req.body.type, req.body.details), 'Privacy request submitted'));
  };
  myRequests = async (req: AuthRequest, res: Response) => res.json(successResponse(await service.listMyRequests(req.user!.id)));
  allRequests = async (_req: AuthRequest, res: Response) => res.json(successResponse(await service.listAllRequests()));
  updateRequest = async (req: AuthRequest, res: Response) => res.json(successResponse(await service.updateRequest(String(req.params.id), req.body.status, req.body.response)));
  breaches = async (_req: AuthRequest, res: Response) => res.json(successResponse(await service.listBreaches()));
  createBreach = async (req: AuthRequest, res: Response) => res.status(201).json(successResponse(await service.createBreach(req.body), 'Incident recorded'));
  cleanup = async (req: AuthRequest, res: Response) => res.json(successResponse(await service.runRetentionCleanup(req.body.notificationDays, req.body.auditDays), 'Retention cleanup completed'));
}
