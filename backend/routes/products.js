// backend/routes/products.js
import { Router } from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
} from "../controllers/products.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/", getAllProducts);
router.get("/:id", getProductById);
router.post("/", authenticate, createProduct);
router.patch("/:id", authenticate, updateProduct);

export default router;
