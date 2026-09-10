import express from 'express';
import { authenticate } from '../../middleware/auth';
import { authorize, adminOrLandlord, tenantOnly } from '../../middleware/rbac';
import { PaymentController } from './controller_payment';

const router = express.Router();
const ctrl = new PaymentController();
router.use(authenticate);
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.get('/', authorize('Admin', 'Landlord', 'Tenant'), ctrl.list);
router.get('/summary', adminOrLandlord, ctrl.summary);
router.get('/:id', authorize('Admin', 'Landlord', 'Tenant'), ctrl.getById);
router.post('/', ctrl.disabled);
router.patch('/:id/mark-paid', ctrl.disabled);
router.patch('/:id/simulate', tenantOnly, ctrl.simulate);
export default router;

