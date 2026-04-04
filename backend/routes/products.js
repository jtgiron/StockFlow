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
import { validate } from "../middlewares/validate.js";
import { createProductSchema, updateProductSchema, bulkCreateProductsSchema } from "../schemas/products.js";

const router = Router();

router.get("/", authenticate, getAllProducts);
router.get("/barcode/:barcode", authenticate, getProductByBarcode);
router.get("/:id", authenticate, getProductById);
router.post("/", authenticate, authorize("admin"), validate(createProductSchema), createProduct);
router.post("/bulk", authenticate, authorize("admin"), validate(bulkCreateProductsSchema), bulkCreateProducts);
router.patch("/:id", authenticate, authorize("admin"), validate(updateProductSchema), updateProduct);
router.patch(
  "/:id/toggle-active",
  authenticate,
  authorize("admin"),
  toggleProductActive,
);
router.delete("/:id", authenticate, authorize("admin"), deleteProduct);

export default router;
