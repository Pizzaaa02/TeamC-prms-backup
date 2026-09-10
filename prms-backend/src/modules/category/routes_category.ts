import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOnly, adminOrAgent } from '../../middleware/rbac';
import { CategoryController } from './controller_category';

const router = express.Router();
const ctrl = new CategoryController();

router.use(authenticate);

// Shared categories - any authenticated user can read
router.get('/shared', ctrl.shared);

// Admin endpoints
router.get('/', adminOrAgent, ctrl.list);
router.post('/', adminOrAgent, ctrl.create);
router.post('/seed', adminOnly, ctrl.seedDefaults);
router.get('/:id', adminOnly, ctrl.getById);
router.put('/:id', adminOnly, ctrl.update);
router.patch('/:id/toggle', adminOnly, ctrl.toggle);
router.delete('/:id', adminOnly, ctrl.remove);

export default router;
