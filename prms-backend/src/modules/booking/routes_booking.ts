import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOrLandlord, adminOrLandlordOrAgent } from '../../middleware/rbac';
import { BookingController } from './controller_booking';

const router = express.Router();
const ctrl = new BookingController();

router.get('/', authenticate, adminOrLandlord, ctrl.list);
router.get('/my-bookings', authenticate, ctrl.myBookings);
// These MUST come before '/:id' — otherwise Express matches
// '/summary', '/check-overlap', and '/assigned' as an :id value and they
// become unreachable.
router.get('/assigned', authenticate, ctrl.agentBookings);
router.get('/landlord', authenticate, ctrl.landlordBookings);
router.get('/summary', authenticate, ctrl.getSummary);
router.get('/check-overlap', authenticate, ctrl.checkOverlap);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, ctrl.create);
router.put('/:id', authenticate, adminOrLandlord, ctrl.update);
router.patch('/:id/confirm', authenticate, adminOrLandlordOrAgent, ctrl.confirm);
router.patch('/:id/reject', authenticate, adminOrLandlordOrAgent, ctrl.reject);
router.patch('/:id/cancel', authenticate, ctrl.cancel);

export default router;
