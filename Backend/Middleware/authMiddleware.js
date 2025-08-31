const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const authMiddleware = (req, res, next) => {
  try {
    const authToken = req.cookies.authToken;
    if (!authToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

module.exports = authMiddleware;
