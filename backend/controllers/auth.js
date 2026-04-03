import { query } from "../database.js";
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from "../utils/auth.js";
import { withTransaction } from "../utils/db.js";
import { AppError } from "../utils/errors.js";
import { hashLocalResetCode } from "../utils/localResetCodes.js";

// Simple validators
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_COMPLEXITY_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

function validatePassword(password) {
  if (!password || typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  if (!PASSWORD_COMPLEXITY_RE.test(password)) {
    return "La contraseña debe incluir al menos una mayúscula, una minúscula y un número";
  }
  return null;
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export const register = async (req, res, next) => {
  try {
    const { email, password, full_name } = req.body;

    // Input validation
    if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      throw new AppError(400, "Email inválido");
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      throw new AppError(400, passwordError);
    }
    if (
      !full_name ||
      typeof full_name !== "string" ||
      full_name.trim() === ""
    ) {
      throw new AppError(400, "El nombre completo es obligatorio");
    }

    const sanitizedEmail = normalizeEmail(email);

    // Check if user already exists
    const existingUser = await query("SELECT id FROM users WHERE email = $1", [
      sanitizedEmail,
    ]);
    if (existingUser.rows.length > 0) {
      throw new AppError(409, "El usuario ya existe");
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await query(
      "INSERT INTO users(email, password_hash, full_name, role, is_active) VALUES($1, $2, $3, $4, $5) RETURNING id, email, full_name, role",
      [sanitizedEmail, hashedPassword, full_name.trim(), "employee", true],
    );

    const user = result.rows[0];

    // Generate tokens
    const access_token = generateAccessToken(user);
    const refresh_token = generateRefreshToken(user);

    res.status(201).json({
      message: "User registered successfully",
      user,
      access_token,
      refresh_token,
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(400, "Email y contraseña son obligatorios");
    }

    const sanitizedEmail = normalizeEmail(email);

    // Find user
    const result = await query(
      "SELECT id, email, full_name, role, password_hash FROM users WHERE email = $1 AND is_active = true",
      [sanitizedEmail],
    );

    if (result.rows.length === 0) {
      throw new AppError(401, "Credenciales inválidas");
    }

    const user = result.rows[0];

    // Check password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new AppError(401, "Credenciales inválidas");
    }

    // Generate tokens
    const access_token = generateAccessToken(user);
    const refresh_token = generateRefreshToken(user);

    // Remove password_hash from user object
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      message: "Login successful",
      user: userWithoutPassword,
      access_token,
      refresh_token,
    });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      throw new AppError(400, "refresh_token es obligatorio");
    }

    const decoded = verifyToken(refresh_token);
    if (!decoded || decoded.type !== "refresh") {
      throw new AppError(401, "Refresh token inválido o expirado");
    }

    // Look up current user state (role may have changed)
    const result = await query(
      "SELECT id, email, full_name, role FROM users WHERE id = $1 AND is_active = true",
      [decoded.id],
    );

    if (result.rows.length === 0) {
      throw new AppError(401, "Usuario no encontrado o desactivado");
    }

    const user = result.rows[0];

    const access_token = generateAccessToken(user);
    const new_refresh_token = generateRefreshToken(user);

    res.json({ access_token, refresh_token: new_refresh_token });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      "SELECT id, email, full_name, role, is_active, created_at, updated_at FROM users WHERE id = $1",
      [userId],
    );

    if (result.rows.length === 0) {
      throw new AppError(404, "Usuario no encontrado");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

export const resetPasswordWithCode = async (req, res, next) => {
  try {
    const sanitizedEmail = normalizeEmail(req.body?.email);
    const resetCode =
      typeof req.body?.reset_code === "string"
        ? req.body.reset_code.trim()
        : typeof req.body?.resetCode === "string"
          ? req.body.resetCode.trim()
          : "";
    const newPassword =
      typeof req.body?.new_password === "string"
        ? req.body.new_password
        : typeof req.body?.newPassword === "string"
          ? req.body.newPassword
          : "";

    if (!sanitizedEmail || !EMAIL_RE.test(sanitizedEmail)) {
      throw new AppError(400, "Email inválido");
    }

    if (!resetCode) {
      throw new AppError(400, "El código de recuperación es obligatorio");
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      throw new AppError(400, passwordError);
    }

    const resetCodeHash = hashLocalResetCode(resetCode);

    await withTransaction(async (tx) => {
      const tokenResult = await tx(
        `SELECT lrc.id, lrc.user_id
         FROM local_password_reset_codes lrc
         JOIN users u ON u.id = lrc.user_id
         WHERE u.email = $1
           AND lrc.code_hash = $2
           AND lrc.used_at IS NULL
           AND lrc.expires_at > NOW()
           AND u.is_active = true
         ORDER BY lrc.created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [sanitizedEmail, resetCodeHash],
      );

      if (tokenResult.rows.length === 0) {
        throw new AppError(400, "Código inválido o expirado");
      }

      const passwordHash = await hashPassword(newPassword);
      const tokenRow = tokenResult.rows[0];

      await tx(
        "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
        [passwordHash, tokenRow.user_id],
      );
      await tx(
        "UPDATE local_password_reset_codes SET used_at = NOW() WHERE id = $1",
        [tokenRow.id],
      );
      await tx(
        `UPDATE local_password_reset_codes
         SET used_at = NOW()
         WHERE user_id = $1 AND id <> $2 AND used_at IS NULL`,
        [tokenRow.user_id, tokenRow.id],
      );
    });

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (err) {
    next(err);
  }
};
