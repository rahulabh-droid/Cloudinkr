import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.Cd_cloud_name,
  api_key: process.env.Cd_api_key,
  api_secret: process.env.Cd_api_secret,
});

export default cloudinary;
