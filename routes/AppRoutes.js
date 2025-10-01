import express from 'express';
import jwt from 'jsonwebtoken';
const router = express.Router();

router.get('/App', (req, res) => {
  const fileUrl = req.query.fileUrl;
  const token = req.cookies.token; // read JWT cookie
  let user = null;

  // Decode JWT if it exists
  if (token) {
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.log("Invalid JWT token:", err.message);
    }
  }

  let files = [];
  if (fileUrl) {
    const decodedUrl = decodeURIComponent(fileUrl);
    files = [{
      originalname: decodedUrl.split('/').pop(),
      path: decodedUrl,
    }];
  }

  // Pass both files and user to EJS
  res.render('Cloudinkr/App.ejs', { files, user });
});

export default router;
