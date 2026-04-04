import { Router } from "express";
import {
  createUser,
  deleteUser,
  generatePasswordResetCode,
  listUsers,
  updateUserRole,
} from "../controllers/users.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { createUserSchema, updateUserRoleSchema } from "../schemas/users.js";

const router = Router();

router.use(authenticate, authorize("admin"));

router.get("/", listUsers);
router.post("/", validate(createUserSchema), createUser);
router.post("/:id/reset-code", generatePasswordResetCode);
router.patch("/:id", validate(updateUserRoleSchema), updateUserRole);
router.delete("/:id", deleteUser);

export default router;
