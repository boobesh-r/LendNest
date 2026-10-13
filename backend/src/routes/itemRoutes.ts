import { Router } from 'express';
import { ItemController } from '../controllers/itemController.js';
import { UploadController } from '../controllers/uploadController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', ItemController.getItems);
router.post('/upload', authMiddleware, UploadController.handleUpload);
router.get('/:id', ItemController.getItemById);
router.post('/', authMiddleware, ItemController.createItem);
router.put('/:id', authMiddleware, ItemController.updateItem);
router.delete('/:id', authMiddleware, ItemController.deleteItem);

export default router;

