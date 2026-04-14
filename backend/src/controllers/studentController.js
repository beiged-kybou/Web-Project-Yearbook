import cloudinary from "../config/cloudinary.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import Memory from "../models/Memory.js";
import Department from "../models/Department.js";
import Image from "../models/Image.js";
import TagNotification from "../models/TagNotification.js";

const uploadBufferToCloudinary = (buffer, folder = "iut-yearbook/profiles") =>
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

export async function getAllStudents(req, res) {
  try {
    const {
      search = "",
      department = "",
      batch,
      limit = 24,
      page = 1,
    } = req.query;

    const pageSize = Math.min(Math.max(Number(limit) || 24, 6), 60);
    const currentPage = Math.max(Number(page) || 1, 1);
    const offset = (currentPage - 1) * pageSize;

    const query = {};

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { studentId: regex }
      ];
    }

    if (department.trim()) {
      query.department = department.trim().toUpperCase();
    }

    // Attempting to match Yearbook ref or year string natively depending on the model 
    // In our model, graduationYear might be a ObjectId for a Yearbook or a year. 
    // Usually batch query maps to the year.
    // If graduation year is a string in user DB or an object id, we need to handle. 
    // Let's assume Student.graduationYear handles an objectid or numerical string reference as string now.
    // I will query native records as they are mapped in MongoDB
    if (batch && Number(batch)) {
        // If graduationYear refers to something else, this might need an aggregation, 
        // but for now let's query the string representation.
        query.graduationYear = batch; 
    }

    const [total, studentsAgg] = await Promise.all([
      Student.countDocuments(query),
      Student.find(query)
        .sort({ graduationYear: -1, firstName: 1 })
        .limit(pageSize)
        .skip(offset)
        .lean()
    ]);
    
    // Resolve departments manually to match the old format
    const deptCodes = studentsAgg.map(s => s.department).filter(Boolean);
    const depts = await Department.find({ code: { $in: deptCodes } }).lean();

    const students = studentsAgg.map(s => {
        const d = depts.find(d => d.code === s.department);
        return {
          studentId: s.studentId,
          firstName: s.firstName,
          lastName: s.lastName,
          email: s.email,
          phone: s.phone,
          department: s.department,
          departmentName: d ? d.name : s.department,
          graduationYear: s.graduationYear, // Might be ObjectId or String depending on setup
          photoUrl: s.photoUrl,
          bio: s.bio,
          motto: s.motto,
          updatedAt: s.updated_at
        };
    });

    res.json({
      students,
      pagination: {
        total,
        page: currentPage,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      filters: {
        search: search.trim(),
        department: department.trim().toUpperCase(),
        batch: batch ? Number(batch) : null,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getStudentsByYear(req, res) {
  try {
    const { year } = req.params;
    const students = await Student.find({ graduationYear: year }).sort({ studentId: 1 }).lean();
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getStudentByName(req, res) {
  try {
    const { name } = req.query;

    if (!name || name.length < 2) {
      return res.status(400).json({
        error: "Search term must be at least 2 characters",
      });
    }

    const regex = new RegExp(name.trim(), "i");
    const students = await Student.find({
        $or: [
            { firstName: regex },
            { lastName: regex },
            { studentId: regex }
        ]
    }).limit(50).lean();

    const mapped = students.map(s => ({
        ...s,
        id: s.studentId, // Ensure frontend compatibility
        full_name: `${s.firstName} ${s.lastName}`.toLowerCase()
    })).sort((a, b) => a.full_name.localeCompare(b.full_name));

    res.json({
      students: mapped,
      count: mapped.length,
      query: name,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getStudentById(req, res) {
  try {
    const { id } = req.params;
    const students = await Student.find({ studentId: id }).lean();
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function createStudent(req, res) {
  try {
    const {
      student_id,
      first_name,
      last_name,
      email,
      phone,
      department,
      photo_url,
      bio,
      motto,
      graduation_year,
    } = req.body;

    const exists = await Student.findOne({ $or: [{ studentId: student_id }, { email }] });
    if (exists) {
        return res.status(409).json({ error: "Student ID or Email already exists." });
    }

    const student = await Student.create({
      studentId: student_id,
      firstName: first_name,
      lastName: last_name,
      email,
      phone,
      department,
      photoUrl: photo_url,
      bio,
      motto,
      graduationYear: graduation_year,
    });

    res.status(201).json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateStudent(req, res) {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      phone,
      department,
      photo_url,
      bio,
      motto,
      graduation_year,
    } = req.body;

    const student = await Student.findOneAndUpdate(
        { studentId: id },
        {
            firstName: first_name,
            lastName: last_name,
            email,
            phone,
            department,
            photoUrl: photo_url,
            bio,
            motto,
            graduationYear: graduation_year,
            updated_at: new Date()
        },
        { new: true }
    );

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteStudent(req, res) {
  try {
    const { id } = req.params;
    
    // Check constraint before deletion (cannot delete if linked to memories)
    // Here we query memory 'createdBy' to ensure referential integrity
    const memoryCount = await Memory.countDocuments({ createdBy: id });
    if (memoryCount > 0) {
        return res.status(400).json({
          error: "Cannot delete student: they are linked to existing memories.",
        });
    }

    const student = await Student.findOneAndDelete({ studentId: id });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({ message: `Student ${id} deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getMyProfile(req, res) {
  try {
    const { userId } = req.user;

    const user = await User.findById(userId).populate({
        path: 'studentId'
    }).lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const profile = user.studentId;

    if (!profile) {
      return res.status(400).json({
        error: "Your account is not linked to a student profile.",
      });
    }

    const memories = await Memory.find({ createdBy: profile.studentId })
        .sort({ created_at: -1 })
        .lean()
        .populate('albumId');

    const memoryIds = memories.map(m => m._id);
    const images = await Image.find({ entityType: 'memory', entityId: { $in: memoryIds.map(String) } }).sort({ sortOrder: 1 });
    const pendingTagsList = await TagNotification.find({ memoryId: { $in: memoryIds }, status: 'pending' }).populate('taggedStudentId');

    const groupedMemories = {
      department: [],
      batch: [],
      public: [],
      drafts: [],
    };

    memories.forEach(m => {
        let privacy = 'public';
        if (m.albumId) {
            privacy = m.albumId.type === 'department' ? 'department' : m.albumId.type === 'batch' ? 'batch' : 'public';
        }

        const mImages = images.filter(i => i.entityId === String(m._id)).map(i => ({
            id: i._id, url: i.photoUrl, sort: i.sortOrder
        }));

        const mTaggedStudents = (m.participants || []).map(p => p.studentId);
        
        const mPendingTags = pendingTagsList.filter(pt => String(pt.memoryId) === String(m._id)).map(pt => pt.taggedStudentId);

        const mappedMemory = {
            id: m._id,
            title: m.title,
            content: m.content,
            created_at: m.created_at,
            status: m.status,
            privacy,
            images: mImages,
            tagged_students: mTaggedStudents,
            pending_tags: mPendingTags
        };

        const statusKey = m.status === "draft" ? "drafts" : null;
        const groupKey = statusKey || privacy;
        
        if (!groupedMemories[groupKey]) {
            groupedMemories[groupKey] = [];
        }
        groupedMemories[groupKey].push(mappedMemory);
    });

    res.json({
      profile: {
        id: user._id,
        displayName: user.displayName,
        email: user.email,
        studentId: profile.studentId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        department: profile.department,
        graduationYear: profile.graduationYear,
        displayPhoto: profile.photoUrl || user.avatarUrl || "",
        motto: profile.motto || "",
        bio: profile.bio || "",
      },
      memories: groupedMemories,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateMyProfile(req, res) {
  const { userId } = req.user;

  const displayPhotoInput = req.body.displayPhoto?.trim() || "";
  const motto = req.body.motto?.trim() || "";
  const bio = req.body.bio?.trim() || "";

  try {
    let resolvedDisplayPhoto = displayPhotoInput;

    if (req.file) {
      if (
        !process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET
      ) {
        return res.status(500).json({
          error:
            "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
        });
      }

      const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
      resolvedDisplayPhoto = uploadResult.secure_url;
    }

    const user = await User.findById(userId).populate('studentId');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const student = user.studentId;
    if (!student) {
      return res.status(400).json({
        error: "Your account is not linked to a student profile.",
      });
    }

    await Student.findByIdAndUpdate(student._id, {
        $set: {
            photoUrl: resolvedDisplayPhoto || null,
            motto: motto || null,
            bio: bio || null,
            updated_at: new Date()
        }
    });

    await User.findByIdAndUpdate(userId, {
        $set: {
            avatarUrl: resolvedDisplayPhoto || null
        }
    });

    // Reuse the getMyProfile logic bypassing REST
    return getMyProfile(req, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
