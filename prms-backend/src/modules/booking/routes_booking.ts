import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOrLandlord, tenantOnly } from '../../middleware/rbac';
import { BookingController } from './controller_booking';

const router = express.Router();
const ctrl = new BookingController();

router.get('/', authenticate, adminOrLandlord, ctrl.list);
router.get('/my-bookings', authenticate, tenantOnly, ctrl.myBookings);
// These two MUST come before '/:id' — otherwise Express matches
// '/summary' and '/check-overlap' as an :id value and they become unreachable.
router.get('/summary', authenticate, adminOrLandlord, ctrl.getSummary);
router.get('/check-overlap', authenticate, tenantOnly, ctrl.checkOverlap);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, tenantOnly, ctrl.create);
router.put('/:id', authenticate, adminOrLandlord, ctrl.update);
router.patch('/:id/confirm', authenticate, adminOrLandlord, ctrl.confirm);
router.patch('/:id/reject', authenticate, adminOrLandlord, ctrl.reject);
router.patch('/:id/cancel', authenticate, ctrl.cancel);

export default router;
