import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt"
import uploadRoute from './routes/uploadroute.js';
import AppRoute from './routes/AppRoutes.js';
import cloudinary from './Cloudinary.js';
import dotenv from "dotenv";
import deleteFiles from './routes/Deletefiles.js';
import googleDriveRoutes from './routes/googledrive.js';
import cookieParser from "cookie-parser";
import { generateToken } from "./utils/jwt.js";
import axios from "axios";
import https from "https";

dotenv.config();
const app = express();
const port = 3000;
const db = new pg.Client({
  user: process.env.Db_user,
  host: process.env.Db_host,
  port: process.env.Db_port,
  database: process.env.Db_database,
  password: process.env.Db_password,
})

db.connect();
app.use(async (req, res, next) => {
  if (req.session && req.session.userId) {
    req.user = { id: req.session.userId };
  }
  next();
});
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});
app.use(cookieParser());
app.use(express.json());
app.use('/api/google', googleDriveRoutes);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(uploadRoute);
app.use(AppRoute);
app.use('/api', deleteFiles);


app.get("/", (req, res) => {
  res.render("Home.ejs");
});
app.get("/signin", (req, res) => {
  res.render("Auth/signin.ejs");
});
app.get("/signup", (req, res) => {
  res.render("Auth/signup.ejs");
});
app.get('/logout', (req, res) => {
  res.clearCookie('token'); // removes the JWT cookie
  res.redirect('/signin');   // redirect to signin page
});

app.get('/files', async (req, res) => {
  try {
    const folderName = 'cloudinkr_uploads';
    const result = await cloudinary.search
      .expression(`folder:${folderName}`)
      .max_results(30)
      .execute();

    res.render('Cloudinkr/file.ejs', { files: result.resources });
  } catch (error) {
    console.error('Cloudinary fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users (email,password) VALUES ($1, $2)", [email, hashedPassword]
    );
    res.redirect("/signin");
  } catch (err) {
    console.error("signup error:", err)
    res.send("Error: could not register");
  }
});

app.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.send("User not found");
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
    const token = generateToken(user);

    // Set JWT in HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,               // cannot be accessed by JS
      secure: process.env.NODE_ENV === "production", // HTTPS only in prod
      sameSite: "Strict",           // prevent CSRF
      maxAge: 3600000               // 1 hour
    });

    // Redirect to your app page
    return res.redirect("/App");
    } else {
    return  res.redirect('/signin');
    }
  } catch (err) {
  console.error("Signin error:", err);  // full error
  res.status(500).send("Error during sign in: " + err.message);
}

});

app.get('/files/duplicates', async (req, res) => {
  try {
    const duplicateIdsResult = await db.query(`
      SELECT public_id
      FROM files
      GROUP BY public_id
      HAVING COUNT(*) > 1
    `);

    if (duplicateIdsResult.rows.length === 0) {
      return res.render('Cloudinkr/file.ejs', { files: [], message: 'No duplicate files found!' });
    }

    const duplicateIds = duplicateIdsResult.rows.map(row => row.public_id);

    const filesResult = await db.query(
      'SELECT * FROM files WHERE public_id = ANY($1)',
      [duplicateIds]
    );

    res.render('Cloudinkr/file.ejs', { files: filesResult.rows, message: 'Showing duplicates' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error finding duplicates');
  }
});

app.get("/download", async (req, res) => {
  // Get the resource_type from the query, which your EJS file is already sending
  const { public_id, resource_type, format } = req.query;

  if (!public_id) {
    return res.status(400).send("Missing file identifier.");
  }

  try {
    // 1. Fetch the resource details using the CORRECT resource_type
    const resource = await cloudinary.api.resource(public_id, {
      resource_type: resource_type || 'auto', // Use the provided type
    });

    if (!resource || !resource.secure_url) {
      return res.status(404).send("Error: File not found.");
    }

    const fileUrl = resource.secure_url;
    const fileName = `${public_id.split('/').pop()}.${format || resource.format}`;

    // 2. Set the download header (this part was correct)
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    // 3. Stream the file instead of redirecting for a more reliable download
    https.get(fileUrl, (stream) => {
      stream.pipe(res);
    }).on('error', (e) => {
      console.error('Error streaming file from Cloudinary:', e);
      res.status(500).send('Error downloading file.');
    });
    
  } catch (err) {
    console.error("Failed to download file:", err);
    res.status(500).send("Server error during download.");
  }
});


app.listen(port, () => {
  console.log(`Server running in port: ${port}`);
})