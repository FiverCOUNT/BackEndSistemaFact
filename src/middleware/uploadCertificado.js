const multer = require('multer');

const ALLOWED = /\.(pfx|p12|pem)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED.test(file.originalname || '')) {
      return cb(new Error('El certificado debe ser .pfx, .p12 o .pem'));
    }
    cb(null, true);
  },
});

module.exports = upload;
