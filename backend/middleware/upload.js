const multer = require('multer');
const path = require('path');

// Configure Disk Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Check destination folder based on field name or route context
    if (file.fieldname === 'banner') {
      cb(null, path.join(__dirname, '../uploads/banners'));
    } else {
      cb(null, path.join(__dirname, '../uploads/avatars'));
    }
  },
  filename: (req, file, cb) => {
    // Generate unique name: fieldname-timestamp.ext
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// File Type Filter
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|webp|gif/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only images are allowed (jpeg, jpg, png, webp, gif)'));
};

// Multer Instance
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

module.exports = upload;
