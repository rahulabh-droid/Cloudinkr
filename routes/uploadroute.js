import express from 'express';
import upload from '../upload.js';
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const db= new pg.Client({
    user: process.env.Db_user,
    host: process.env.Db_host,
    port: process.env.Db_port,
    database: process.env.Db_database,
    password: process.env.Db_password,
    ssl: { rejectUnauthorized: false },
});

db.connect();

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log("File upload object:", req.file);
    const originalname = req.file.originalname;
    const url = req.file.path;          
    const public_id = req.file.filename; 
    await db.query(
      'INSERT INTO files (filename, public_id, url) VALUES ($1, $2, $3)',
      [originalname, public_id, url]
    );

    res.redirect(`/App?fileUrl=${encodeURIComponent(url)}`);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).send('Upload failed: ' + error.message);
  }
});



export default router;
