import express from 'express';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { MaintenanceController } from './controller_maintenance';

const router = express.Router();
const ctrl = new MaintenanceController();

router.use(authenticate);
router.get('/', authorize('Admin', 'Landlord', 'Agent'), ctrl.list);
router.get('/mine', ctrl.mine);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', authorize('Admin', 'Landlord', 'Agent'), ctrl.update);
router.patch('/:id/resolve', authorize('Admin', 'Landlord', 'Agent'), ctrl.resolve);

export default router;
