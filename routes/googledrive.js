import express from "express";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import cloudinary from "../Cloudinary.js";
import { authenticateToken} from "../utils/jwt.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();


// --- OAuth2 client ---
const getOAuth2Client = () => {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

// --- 1️⃣ Connect to Google Drive ---
router.get("/connect", authenticateToken, (req, res) => {
  const oauth2Client = getOAuth2Client();
  const scopes = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
  ];
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline", // get refresh token
    scope: scopes,
    prompt: "consent",      // force consent
  });
  res.redirect(url);
});

// --- 2️⃣ OAuth callback (show files in HTML) ---
router.get("/callback",async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing code");

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // List first 50 files
    const response = await drive.files.list({
      pageSize: 50,
      fields: "files(id, name, mimeType, webViewLink)",
    });

    const files = response.data.files;

    res.render("Cloudinkr/googleDriveFiles.ejs", { files, accessToken: tokens.access_token });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to connect Google Drive.");
  }
});

// --- 3️⃣ Import file to Cloudinary ---
router.post("/import", authenticateToken, async (req, res) => {
  const { fileId, accessToken } = req.body;
  if (!fileId || !accessToken)
    return res.status(400).json({ success: false, message: "fileId and accessToken required" });

  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const fileResponse = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    // ✅ Cloudinary upload with folder "cloudinkr_uploads" and auto-detect file type
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder: "cloudinkr_uploads",
        public_id: `${fileId}`,
        resource_type: "auto"
      },
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: "Cloudinary upload failed" });
        }
        res.json({ success: true, url: result.secure_url });
      }
    );

    // Pipe the Google Drive file stream into Cloudinary
    fileResponse.data.pipe(uploadStream);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to import file" });
  }
});


export default router;
