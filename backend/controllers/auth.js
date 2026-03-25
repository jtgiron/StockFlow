import { query } from "../database.js";
import { hashPassword, comparePassword, generateToken } from "../utils/auth.js";

export const register = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // Check if user already exists
    const existingUser = await query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await query(
      "INSERT INTO users(email, password_hash, full_name, role, is_active) VALUES($1, $2, $3, $4, $5) RETURNING id, email, full_name, role",
      [email, hashedPassword, fullName, "employee", true],
    );

    // Generate token
    const token = generateToken(result.rows[0]);

    res.status(201).json({
      message: "User registered successfully",
      user: result.rows[0],
      token,
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await query(
      "SELECT id, email, full_name, role, password_hash FROM users WHERE email = $1 AND is_active = true",
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Check password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate token
    const token = generateToken(user);

    // Remove password_hash from user object
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      message: "Login successful",
      user: userWithoutPassword,
      access_token: token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      "SELECT id, email, full_name, role, is_active, created_at, updated_at FROM users WHERE id = $1",
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
