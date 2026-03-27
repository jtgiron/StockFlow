import { query } from "../database.js";
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from "../utils/auth.js";
import { AppError } from "../utils/errors.js";

// Simple validators
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export const register = async (req, res, next) => {
  try {
    const { email, password, full_name } = req.body;

    // Input validation
    if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      throw new AppError(400, "Email inválido");
    }
    if (
      !password ||
      typeof password !== "string" ||
      password.length < MIN_PASSWORD_LENGTH
    ) {
      throw new AppError(
        400,
        `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
      );
    }
    if (
      !full_name ||
      typeof full_name !== "string" ||
      full_name.trim() === ""
    ) {
      throw new AppError(400, "El nombre completo es obligatorio");
    }

    const sanitizedEmail = email.trim().toLowerCase();

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

    const sanitizedEmail = String(email).trim().toLowerCase();

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
