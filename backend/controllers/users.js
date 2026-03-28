import { query } from "../database.js";
import { hashPassword } from "../utils/auth.js";
import {
  generateLocalResetCode,
  getLocalResetCodeExpiryDate,
  getLocalResetCodeExpiryMinutes,
  hashLocalResetCode,
} from "../utils/localResetCodes.js";

const VALID_ROLES = new Set(["admin", "employee"]);

function normalizeCreatePayload(body = {}) {
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const fullName =
    typeof body.fullName === "string"
      ? body.fullName.trim()
      : typeof body.full_name === "string"
        ? body.full_name.trim()
        : "";
  const role =
    typeof body.role === "string" ? body.role.trim().toLowerCase() : "employee";
  return { email, password, fullName, role };
}

export const listUsers = async (req, res) => {
  try {
    const result = await query(
      "SELECT id, email, full_name, role, is_active, created_at, updated_at FROM users WHERE is_active = true ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const createUser = async (req, res) => {
  try {
    const { email, password, fullName, role } = normalizeCreatePayload(
      req.body,
    );

    if (!email || !password || !fullName) {
      return res
        .status(400)
        .json({ message: "email, password y fullName son obligatorios" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "La contrasena debe tener al menos 6 caracteres" });
    }
    if (!VALID_ROLES.has(role)) {
      return res.status(400).json({ message: "Rol invalido" });
    }

    const existing = await query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "El email ya esta registrado" });
    }

    const passwordHash = await hashPassword(password);
    const result = await query(
      "INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id, email, full_name, role, is_active, created_at, updated_at",
      [email, passwordHash, fullName, role],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role =
      typeof req.body?.role === "string"
        ? req.body.role.trim().toLowerCase()
        : "";

    if (!VALID_ROLES.has(role)) {
      return res.status(400).json({ message: "Rol invalido" });
    }

    const result = await query(
      "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 AND is_active = true RETURNING id, email, full_name, role, is_active, created_at, updated_at",
      [role, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update user role error:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res
        .status(400)
        .json({ message: "No puedes eliminar tu propio usuario" });
    }

    const result = await query(
      "UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 AND is_active = true RETURNING id",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(204).send();
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const generatePasswordResetCode = async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await query(
      "SELECT id, full_name FROM users WHERE id = $1 AND is_active = true",
      [id],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const resetCode = generateLocalResetCode();
    const codeHash = hashLocalResetCode(resetCode);
    const expiresAt = getLocalResetCodeExpiryDate();

    await query(
      "UPDATE local_password_reset_codes SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
      [id],
    );
    await query(
      `INSERT INTO local_password_reset_codes
       (user_id, code_hash, expires_at, created_by_user_id)
       VALUES ($1, $2, $3, $4)`,
      [id, codeHash, expiresAt, req.user.id],
    );

    res.json({
      message: "Código de recuperación generado",
      reset_code: resetCode,
      expires_at: expiresAt,
      expires_in_minutes: getLocalResetCodeExpiryMinutes(),
      user: {
        id: userResult.rows[0].id,
        full_name: userResult.rows[0].full_name,
      },
    });
  } catch (err) {
    console.error("Generate reset code error:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
