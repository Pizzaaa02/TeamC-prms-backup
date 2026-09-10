import express from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth';
import { adminOnly } from '../../middleware/rbac';
import { CustomizerController } from './controller_customizer';

const router = express.Router();
const ctrl = new CustomizerController();

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// GET /config is public — guests need it for branding
router.get('/config', ctrl.getConfig);
router.get('/preview', ctrl.getPreview);
router.get('/health', (_req, res) => res.json({ success: true, service: 'customizer', status: 'ok' }));

// Protected routes
router.use(authenticate);
router.put('/config', adminOnly, ctrl.updateConfig);
router.post('/upload-logo', adminOnly, logoUpload.single('logo'), ctrl.uploadLogo);
router.delete('/logo', adminOnly, ctrl.removeLogo);

export default router;
