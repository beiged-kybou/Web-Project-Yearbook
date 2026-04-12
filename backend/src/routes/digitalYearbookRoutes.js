import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { 
  getPotentialYearbookPosts, 
  createYearbook, 
  getYearbookById 
} from '../controllers/digitalYearbookController.js';

const router = express.Router();

router.use(authenticate);

router.get('/studio/posts', getPotentialYearbookPosts);
router.post('/', createYearbook);
router.get('/:id', getYearbookById);

export default router;
