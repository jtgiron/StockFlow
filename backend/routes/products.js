// backend/routes/products.js
import { Router } from "express";
import {
  getAllProducts,
  getProductById,
  getProductByBarcode,
  createProduct,
  updateProduct,
  toggleProductActive,
  deleteProduct,
  bulkCreateProducts,
} from "../controllers/products.js";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = Router();

router.get("/", authenticate, getAllProducts);
router.get("/barcode/:barcode", authenticate, getProductByBarcode);
router.get("/:id", authenticate, getProductById);
router.post("/", authenticate, authorize("admin"), createProduct);
router.post("/bulk", authenticate, authorize("admin"), bulkCreateProducts);
router.patch("/:id", authenticate, authorize("admin"), updateProduct);
router.patch(
  "/:id/toggle-active",
  authenticate,
  authorize("admin"),
  toggleProductActive,
);
router.delete("/:id", authenticate, authorize("admin"), deleteProduct);

export default router;
