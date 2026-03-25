import { verifyToken } from "../utils/auth.js";

export const authenticate = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Add user info to request
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Authentication error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Access forbidden: Admin rights required" });
  }
  next();
};
