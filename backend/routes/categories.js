// backend/routes/categories.js
import { Router } from "express";
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categories.js";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = Router();

router.get("/", authenticate, getAllCategories);
router.get("/:id", authenticate, getCategoryById);
router.post("/", authenticate, authorize("admin"), createCategory);
router.patch("/:id", authenticate, authorize("admin"), updateCategory);
router.delete("/:id", authenticate, authorize("admin"), deleteCategory);

export default router;
