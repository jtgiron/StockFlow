import { Router } from "express";
import {
  createUser,
  deleteUser,
  generatePasswordResetCode,
  listUsers,
  updateUserRole,
} from "../controllers/users.js";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate, authorize("admin"));

router.get("/", listUsers);
router.post("/", createUser);
router.post("/:id/reset-code", generatePasswordResetCode);
router.patch("/:id", updateUserRole);
router.delete("/:id", deleteUser);

export default router;
