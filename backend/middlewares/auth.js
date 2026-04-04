import { verifyToken } from "../utils/auth.js";
import { query } from "../database.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ message: "Invalid token" });
    }

    if (!decoded.id) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const result = await query(
      "SELECT id, email, role, is_active FROM users WHERE id = $1 LIMIT 1",
      [decoded.id],
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res
        .status(401)
        .json({ message: "Usuario no encontrado o desactivado" });
    }

    req.user = {
      ...decoded,
      id: result.rows[0].id,
      email: result.rows[0].email,
      role: result.rows[0].role,
    };
    next();
  } catch (err) {
    console.error("Authentication error:", err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Acceso denegado: se requieren permisos de administrador",
    });
  }
  next();
};

/**
 * Middleware that allows access only to the specified roles.
 * Usage: authorize('admin', 'employee')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Acceso denegado: se requiere rol ${roles.join(" o ")}`,
      });
    }
    next();
  };
};
