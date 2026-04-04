// backend/routes/priceLists.js
import { Router } from "express";
import {
  getLists,
  createList,
  updateList,
  deleteList,
  getItems,
  addItem,
  removeItem,
  applyList,
} from "../controllers/priceLists.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { createListSchema, addItemSchema } from "../schemas/priceLists.js";

const router = Router();

// Lists
router.get("/", authenticate, authorize("admin"), getLists);
router.post("/", authenticate, authorize("admin"), validate(createListSchema), createList);
router.patch("/:id", authenticate, authorize("admin"), validate(createListSchema), updateList);
router.delete("/:id", authenticate, authorize("admin"), deleteList);

// Items
router.get("/:listId/items", authenticate, authorize("admin"), getItems);
router.post("/:listId/items", authenticate, authorize("admin"), validate(addItemSchema), addItem);
router.delete(
  "/:listId/items/:itemId",
  authenticate,
  authorize("admin"),
  removeItem,
);

// Apply
router.post("/:listId/apply", authenticate, authorize("admin"), applyList);

export default router;
