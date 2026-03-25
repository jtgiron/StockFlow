// backend/routes/products.js
import { Router } from 'express';
import { getAllProducts, getProductById, createProduct } from '../controllers/products.js';

const router = Router();

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', createProduct);

export default router;
