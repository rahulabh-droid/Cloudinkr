// utils/jwt.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "1h";

/**
 * Generate a JWT token for a user
 * @param {Object} user - user object containing id, email, role
 * @returns {string} JWT token
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || "user",
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Middleware to authenticate JWT token
 * Supports both HTTP-only cookies and Authorization headers
 */
export function authenticateToken(req, res, next) {
  // 1️⃣ Try Authorization header first
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  // 2️⃣ Fallback to cookie if header not present
  if (!token && req.cookies) {
    token = req.cookies.token;
  }

  if (!token) return res.status(401).send("Access Denied");

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user; // attach user info to request
    next();
  } catch {
    return res.status(403).send("Invalid Token");
  }
}
