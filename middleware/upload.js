const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = file.mimetype === "image/jpeg" ? ".jpg" :
      file.mimetype === "image/png" ? ".png" : ".webp";
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) return cb(new Error("Only JPEG, PNG and WEBP images are allowed"));
    cb(null, true);
  }
});

function deleteImage(imagePath) {
  if (!imagePath) return;
  const filename = path.basename(imagePath);
  const fullPath = path.join(uploadDir, filename);
  fs.unlink(fullPath, () => {});
}

module.exports = { upload, deleteImage };