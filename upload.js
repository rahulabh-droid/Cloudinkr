import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './Cloudinary.js'; 

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    let resourceType = 'auto';
    let useFilename = false;
    let uniqueFilename = true;

    if (file.mimetype === 'application/pdf') {
      resourceType = 'image';
      useFilename = true;       // use original name
      uniqueFilename = false;   // do not alter name
    }

    return {
      folder: 'cloudinkr_uploads',
      resource_type: resourceType,
      type: 'upload',
      use_filename: useFilename,
      unique_filename: uniqueFilename,
    };
  },
});

const upload = multer({ storage });
export default upload;
