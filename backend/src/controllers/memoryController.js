import cloudinary from "../config/cloudinary.js";

const PRIVACY_CONFIG = {
  department: {
    albumType: "department",
    title: "Department Memories",
    description: null,
  },
  batch: {
    albumType: "batch",
    title: "Batch Memories",
    description: null,
  },
  public: {
    albumType: "group",
    title: "Public Memories",
    description: null,
  },
};

const normalizeStringArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    } catch {
      return trimmed
        .split(/\n|,|\s+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const isLikelyUrl = (url) => /^https?:\/\//i.test(url);

const uploadBufferToCloudinary = (buffer, folder = "iut-yearbook/memories") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      },
    );

    stream.end(buffer);
  });

const isEligibleForPrivacy = (privacy, creator, candidate) => {
  if (privacy === "public") {
    return true;
  }

  if (privacy === "department") {
    return (
      Boolean(candidate.department) &&
      Boolean(creator.department) &&
      candidate.department === creator.department
    );
  }

  if (privacy === "batch") {
    return (
      Boolean(candidate.graduation_year) &&
      Boolean(creator.graduation_year) &&
      Number(candidate.graduation_year) === Number(creator.graduation_year)
    );
  }

  return false;
};

export const createMemory = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { userId } = req.user;

  const headline = req.body.headline?.trim();
  const caption = req.body.caption?.trim();
  const privacy = (req.body.privacy || "public").trim().toLowerCase();
  const imageUrls = normalizeStringArray(req.body.imageUrls).filter(isLikelyUrl);
  const taggedStudentIds = [...new Set(normalizeStringArray(req.body.taggedStudentIds))];

  if (!headline) {
    return res.status(400).json({ error: "Headline is required." });
  }

  if (!caption) {
    return res.status(400).json({ error: "Caption is required." });
  }

  if (!Object.keys(PRIVACY_CONFIG).includes(privacy)) {
    return res.status(400).json({ error: "Invalid privacy. Use department, batch, or public." });
  }

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return res.status(500).json({
      error: "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    });
  }

  try {
    const userResult = await pool.query(
      `SELECT u.student_id, s.department, s.graduation_year
       FROM users u
       LEFT JOIN students s ON u.student_id = s.student_id
       WHERE u.id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const creator = userResult.rows[0];
    const creatorStudentId = creator.student_id;

    if (!creatorStudentId) {
      return res
        .status(400)
        .json({ error: "Your account is not linked to a student profile yet." });
    }

    if (privacy === "department" && !creator.department) {
      return res.status(400).json({ error: "No department found for your profile." });
    }

    if (privacy === "batch" && !creator.graduation_year) {
      return res.status(400).json({ error: "No batch found for your profile." });
    }

    const privacyConfig = PRIVACY_CONFIG[privacy];

    const albumLookupResult = await pool.query(
      `SELECT id
       FROM albums
       WHERE type = $1 AND created_by = $2 AND title = $3
       LIMIT 1`,
      [privacyConfig.albumType, creatorStudentId, privacyConfig.title],
    );

    let albumId;
    if (albumLookupResult.rows.length > 0) {
      albumId = albumLookupResult.rows[0].id;
    } else {
      const albumInsertResult = await pool.query(
        `INSERT INTO albums (title, description, type, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [privacyConfig.title, privacyConfig.description, privacyConfig.albumType, creatorStudentId],
      );
      albumId = albumInsertResult.rows[0].id;
    }

    const memoryInsertResult = await pool.query(
      `INSERT INTO memories (title, content, created_by, album_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, content, created_by, album_id, created_at`,
      [headline, caption, creatorStudentId, albumId],
    );

    const memory = memoryInsertResult.rows[0];

    const uploadedImageUrls = [];
    for (const file of req.files || []) {
      const uploadResult = await uploadBufferToCloudinary(file.buffer);
      uploadedImageUrls.push(uploadResult.secure_url);
    }

    const combinedImageUrls = [...uploadedImageUrls, ...imageUrls];

    for (let index = 0; index < combinedImageUrls.length; index += 1) {
      await pool.query(
        `INSERT INTO images (entity_type, entity_id, photo_url, sort_order)
         VALUES ('memory', $1, $2, $3)`,
        [String(memory.id), combinedImageUrls[index], index],
      );
    }

    const cleanTagIds = taggedStudentIds.filter((studentId) => studentId !== creatorStudentId);

    let existingTaggedRows = [];
    if (cleanTagIds.length > 0) {
      const existingTagsResult = await pool.query(
        `SELECT student_id, department, graduation_year
         FROM students
         WHERE student_id = ANY($1::varchar[])`,
        [cleanTagIds],
      );

      existingTaggedRows = existingTagsResult.rows;
    }

    const existingStudentIds = existingTaggedRows.map((row) => row.student_id);
    const invalidTaggedStudentIds = cleanTagIds.filter(
      (studentId) => !existingStudentIds.includes(studentId),
    );

    const eligibleTaggedIds = existingTaggedRows
      .filter((row) => isEligibleForPrivacy(privacy, creator, row))
      .map((row) => row.student_id);

    const outOfPrivacyGroupTagIds = existingStudentIds.filter(
      (studentId) => !eligibleTaggedIds.includes(studentId),
    );

    if (eligibleTaggedIds.length > 0) {
      await pool.query(
        `INSERT INTO memory_participants (memory_id, student_id)
         SELECT $1, tagged_id
         FROM unnest($2::varchar[]) AS tagged_id
         ON CONFLICT DO NOTHING`,
        [memory.id, eligibleTaggedIds],
      );
    }

    return res.status(201).json({
      message: "Memory published successfully.",
      memory,
      privacy,
      imagesAdded: combinedImageUrls.length,
      uploadedFiles: uploadedImageUrls.length,
      linkedImageUrls: imageUrls.length,
      tagsAdded: eligibleTaggedIds,
      tagsSkipped: [...invalidTaggedStudentIds, ...outOfPrivacyGroupTagIds],
      outOfPrivacyGroupTagIds,
      invalidTaggedStudentIds,
    });
  } catch (error) {
    console.error("Create Memory Error:", error);
    return res.status(500).json({ error: "Failed to create memory." });
  }
};

export const createPublicMemory = (req, res) => {
  req.body = { ...req.body, privacy: "public" };
  return createMemory(req, res);
};
