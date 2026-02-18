import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (_req, file, callback) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    callback(null, true);
    return;
  }

  callback(new Error("Only image files are allowed."));
};

export const memoryUpload = multer({
  storage,
  fileFilter,
  limits: {
    files: 10,
    fileSize: 5 * 1024 * 1024,
  },
});
