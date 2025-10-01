import express from 'express';
import cloudinary from '../Cloudinary.js';
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
const db = new pg.Client({
  user: process.env.Db_user,
  host: process.env.Db_host,
  port: process.env.Db_port,
  database: process.env.Db_database,
  password: process.env.Db_password,
})

db.connect();
const router = express.Router();

router.post('/delete-files', async (req, res) => {
  console.log('Request body:', req.body);
  const files = req.body.files;

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty files array' });
  }

  try {
    const results = await Promise.all(
      files.map(({ public_id, resource_type }) =>
        cloudinary.uploader.destroy(public_id, { resource_type: resource_type || "image" })
      )
    );

    // Remove from DB after successful deletion
    await Promise.all(
      files.map(({ public_id }) =>
        db.query('DELETE FROM files WHERE public_id=$1', [public_id])
      )
    );

    console.log('Delete results:', results);
    return res.json({ success: true, results });
  } catch (err) {
    console.error('Cloudinary delete error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete files' });
  }
});

export default router;
