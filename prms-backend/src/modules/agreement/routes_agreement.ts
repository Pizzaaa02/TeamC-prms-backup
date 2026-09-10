import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { adminOrLandlord, authorize, tenantOnly } from '../../middleware/rbac';
import * as service from './service_agreement';
import { successResponse } from '../../utils/response';
import { recordAudit } from '../admin/service_audit';

const router = express.Router();
router.use(authenticate);

const agreementRoles = authorize('Tenant', 'Landlord', 'Admin');

function actor(req: AuthRequest): service.AgreementActor {
  return { id: req.user!.id, role: req.user!.role };
}

async function audit(req: AuthRequest, action: string, entityId?: string, status = 'Success', errorMessage?: string) {
  await recordAudit({
    userId: req.user?.id,
    username: req.user?.email,
    userRole: req.user?.role,
    module: 'Agreement',
    action,
    entity: 'RentalAgreement',
    entityId,
    description: `${action.replace(/_/g, ' ').toLowerCase()}${entityId ? ` ${entityId}` : ''}`,
    status,
    level: status === 'Success' ? 'info' : 'error',
    errorMessage,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    requestUrl: req.originalUrl,
    httpMethod: req.method,
  });
}

async function fail(req: AuthRequest, res: Response, action: string, error: any) {
  await audit(req, action, String(req.params.id || ''), 'Failed', error.message);
  const status = error instanceof service.AgreementError ? error.statusCode : 500;
  return res.status(status).json({ success: false, error: { message: error.message || 'Agreement request failed' } });
}

router.get('/', adminOrLandlord, async (req: AuthRequest, res) => {
  try {
    const data = await service.getAgreements(actor(req));
    await audit(req, 'VIEW_AGREEMENTS');
    res.json(successResponse(data));
  } catch (error: any) { return fail(req, res, 'VIEW_AGREEMENTS', error); }
});

router.get('/mine', tenantOnly, async (req: AuthRequest, res) => {
  try {
    const data = await service.getMyAgreements(req.user!.id);
    await audit(req, 'VIEW_MY_AGREEMENTS');
    res.json(successResponse(data));
  } catch (error: any) { return fail(req, res, 'VIEW_MY_AGREEMENTS', error); }
});

router.get('/:id', agreementRoles, async (req: AuthRequest, res) => {
  try {
    const data = await service.getAgreement(String(req.params.id), actor(req));
    if (!data) throw new service.AgreementError('Agreement not found', 404);
    await audit(req, 'VIEW_AGREEMENT', data.id);
    res.json(successResponse(data));
  } catch (error: any) { return fail(req, res, 'VIEW_AGREEMENT', error); }
});

router.post('/:id/sign', authorize('Tenant', 'Landlord'), async (req: AuthRequest, res) => {
  try {
    const data = await service.signAgreement(String(req.params.id), actor(req), req.body.signature);
    await audit(req, req.user!.role === 'Tenant' ? 'TENANT_SIGN_AGREEMENT' : 'LANDLORD_SIGN_AGREEMENT', data.id);
    res.json(successResponse(data, data.status === 'ACTIVE' ? 'Agreement fully signed and active' : 'Signature recorded'));
  } catch (error: any) { return fail(req, res, 'SIGN_AGREEMENT', error); }
});

// Backward-compatible Tenant endpoint used by earlier frontend versions.
router.post('/:id/accept', tenantOnly, async (req: AuthRequest, res) => {
  try {
    const data = await service.acceptAgreement(String(req.params.id), req.user!.id, req.body.signature);
    await audit(req, 'TENANT_SIGN_AGREEMENT', data.id);
    res.json(successResponse(data, data.status === 'ACTIVE' ? 'Agreement fully signed and active' : 'Tenant signature recorded'));
  } catch (error: any) { return fail(req, res, 'TENANT_SIGN_AGREEMENT', error); }
});

export default router;
