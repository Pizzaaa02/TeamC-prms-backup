import express from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import * as service from './service_agreement';
import { successResponse } from '../../utils/response';

const router = express.Router();
router.use(authenticate);
router.get('/mine', async (req: AuthRequest, res) => res.json(successResponse(await service.getMyAgreements(req.user!.id))));
router.get('/:id', async (req: AuthRequest, res) => {
  const data = await service.getAgreement(String(req.params.id), req.user!.id, req.user!.role);
  if (!data) return res.status(404).json({ success: false, error: { message: 'Agreement not found' } });
  res.json(successResponse(data));
});
router.post('/:id/accept', async (req: AuthRequest, res) => {
  if (!req.body.signature?.trim()) return res.status(400).json({ success: false, error: { message: 'Signature is required' } });
  res.json(successResponse(await service.acceptAgreement(String(req.params.id), req.user!.id, req.body.signature.trim()), 'Agreement accepted'));
});
export default router;
