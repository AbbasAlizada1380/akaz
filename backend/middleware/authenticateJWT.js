import jwt from "jsonwebtoken";

const secretKey = process.env.SEKRET_KEY;

const authenticateJWT = (req, res, next) => {
  try {
    if (!secretKey) {
      console.error("JWT Secret Key is missing in environment variables.");
      return res.status(500).json({ message: "Server configuration error" });
    }

    // Extract token
    let token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ message: "توکن ارائه نشده است." });
    }

    // Support both "Bearer <token>" and direct token
    if (token.includes(" ")) {
      token = token.split(" ")[1];
    }

    // Verify token
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "توکن نامعتبر است." });
      }

      req.user = decoded; // Save decoded user info in request
      next(); // Pass to next handler
    });
  } catch (error) {
    res.status(500).json({ message: "خطای داخلی سرور." });
  }
};

export default authenticateJWT;
