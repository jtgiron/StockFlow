import { Router } from "express";
import {
  createUser,
  deleteUser,
  listUsers,
  updateUserRole,
} from "../controllers/users.js";
import { authenticate, authorizeAdmin } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate, authorizeAdmin);

router.get("/", listUsers);
router.post("/", createUser);
router.patch("/:id", updateUserRole);
router.delete("/:id", deleteUser);

export default router;
