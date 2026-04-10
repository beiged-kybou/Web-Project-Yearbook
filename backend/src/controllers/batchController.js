import Student from "../models/Student.js";
import Memory from "../models/Memory.js";
import Yearbook from "../models/Yearbook.js";
import Department from "../models/Department.js";
import Album from "../models/Album.js";
import Image from "../models/Image.js";
import mongoose from "mongoose";

const deriveBatchLabel = (graduationYear) => {
  if (!graduationYear || Number.isNaN(Number(graduationYear))) {
    return {
      graduationYear: null,
      entryYear: null,
      label: "Upcoming Batch",
    };
  }

  const entryYear = graduationYear - 4;
  const shortEntry = entryYear ? String(entryYear).slice(-2) : null;
  const label = shortEntry ? `Batch '${shortEntry}` : `Class of ${graduationYear}`;

  return {
    graduationYear,
    entryYear,
    label,
  };
};

const buildExcerpt = (content = "", limit = 180) => {
  if (!content) return "";
  if (content.length <= limit) return content;
  return `${content.slice(0, limit).trim()}…`;
};

export const listBatches = async (req, res) => {
  try {
    // Collect all available years
    const yearbooks = await Yearbook.find().lean();
    const studentsAgg = await Student.aggregate([
      { $match: { graduationYear: { $ne: null } } },
      { $group: { _id: "$graduationYear" } }
    ]);
    
    // Merge available years
    const yearSet = new Set();
    yearbooks.forEach(y => yearSet.add(String(y._id))); // Assuming Yearbook._id is referenced in student
    studentsAgg.forEach(s => yearSet.add(String(s._id)));
    
    const availableYearsIds = Array.from(yearSet).map(id => new mongoose.Types.ObjectId(id));
    
    // Fetch Yearbooks to resolve year numbers
    const validYearbooks = await Yearbook.find({ _id: { $in: availableYearsIds } }).lean();
    validYearbooks.sort((a, b) => b.year - a.year);

    const batches = [];

    for (const yearbook of validYearbooks) {
      const graduationYear = yearbook.year;

      const [studentCount, studentsInYear] = await Promise.all([
        Student.countDocuments({ graduationYear: yearbook._id }),
        Student.find({ graduationYear: yearbook._id }).select('studentId department').lean()
      ]);

      const studentIds = studentsInYear.map(s => s.studentId);

      const [memoryCount, latestMemory, highlightMemory] = await Promise.all([
        Memory.countDocuments({ createdBy: { $in: studentIds } }),
        Memory.findOne({ createdBy: { $in: studentIds } }).sort({ created_at: -1 }).select('created_at').lean(),
        Memory.findOne({ createdBy: { $in: studentIds } }).sort({ created_at: -1 }).populate('createdBy', 'firstName lastName').lean()
      ]);

      // Calculate Top Departments natively in node since array is already loaded
      const deptCounts = {};
      studentsInYear.forEach(s => {
          if (s.department) {
              deptCounts[s.department] = (deptCounts[s.department] || 0) + 1;
          }
      });
      // Resolve dept names
      let topDepartmentsRaw = Object.keys(deptCounts).map(code => ({ code, studentCount: deptCounts[code] }))
          .sort((a, b) => b.studentCount - a.studentCount).slice(0, 3);
      
      const deptCodes = topDepartmentsRaw.map(d => d.code);
      const depts = await Department.find({ code: { $in: deptCodes } }).lean();
      
      const topDepartments = topDepartmentsRaw.map(dept => {
          const matchedDept = depts.find(d => d.code === dept.code);
          const percentage = studentCount ? Number(((dept.studentCount / studentCount) * 100).toFixed(1)) : 0;
          return {
              code: dept.code,
              name: matchedDept ? matchedDept.name : dept.code,
              studentCount: dept.studentCount,
              percentage
          };
      });

      let highlight = null;
      if (highlightMemory) {
          const coverImg = await Image.findOne({ entityType: 'memory', entityId: String(highlightMemory._id) }).sort({ sortOrder: 1 }).lean();
          highlight = {
              memoryId: highlightMemory._id,
              title: highlightMemory.title,
              content: highlightMemory.content,
              excerpt: buildExcerpt(highlightMemory.content, 200),
              createdAt: highlightMemory.created_at,
              authorName: highlightMemory.createdBy ? `${highlightMemory.createdBy.firstName} ${highlightMemory.createdBy.lastName}` : 'Unknown',
              coverImage: coverImg ? coverImg.photoUrl : null
          };
      }

      const { entryYear, label } = deriveBatchLabel(graduationYear);

      batches.push({
        graduationYear,
        entryYear,
        label,
        theme: yearbook.theme || null,
        studentCount,
        memoryCount,
        topDepartments,
        highlight,
        lastMemoryAt: latestMemory ? latestMemory.created_at : null
      });
    }

    return res.status(200).json({
      batches,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("List Batches Error:", error);
    return res.status(500).json({ error: "Failed to load batch timeline." });
  }
};

export const getBatchDetails = async (req, res) => {
  const graduationYear = Number(req.params.year);

  if (!Number.isInteger(graduationYear)) {
    return res.status(400).json({ error: "Invalid batch year." });
  }

  try {
    const yearbook = await Yearbook.findOne({ year: graduationYear }).lean();
    if (!yearbook) {
        return res.status(404).json({ error: "Batch not found." });
    }

    const students = await Student.find({ graduationYear: yearbook._id }).lean();
    const studentCount = students.length;
    const studentIds = students.map(s => s.studentId);

    const memoryCount = await Memory.countDocuments({ createdBy: { $in: studentIds } });
    const latestMemory = await Memory.findOne({ createdBy: { $in: studentIds } }).sort({ created_at: -1 }).select('created_at').lean();
    const { entryYear, label } = deriveBatchLabel(graduationYear);

    // Department Breakdown
    const deptCounts = {};
    students.forEach(s => {
        if (s.department) {
            deptCounts[s.department] = (deptCounts[s.department] || 0) + 1;
        }
    });
    
    let deptBreakdownRaw = Object.keys(deptCounts).map(code => ({ code, studentCount: deptCounts[code] }))
        .sort((a, b) => b.studentCount - a.studentCount);
        
    const depts = await Department.find({ code: { $in: deptBreakdownRaw.map(d => d.code) } }).lean();
    
    const departmentBreakdown = deptBreakdownRaw.map(dept => {
        const matchedDept = depts.find(d => d.code === dept.code);
        const percentage = studentCount ? Number(((dept.studentCount / studentCount) * 100).toFixed(1)) : 0;
        return {
            code: dept.code,
            name: matchedDept ? matchedDept.name : dept.code,
            studentCount: dept.studentCount,
            percentage
        };
    });

    const highlightMemoryDoc = await Memory.findOne({ createdBy: { $in: studentIds } }).sort({ created_at: -1 }).populate('createdBy', 'firstName lastName').lean();
    let highlightMemory = null;
    if (highlightMemoryDoc) {
        const coverImg = await Image.findOne({ entityType: 'memory', entityId: String(highlightMemoryDoc._id) }).sort({ sortOrder: 1 }).lean();
        highlightMemory = {
            id: highlightMemoryDoc._id,
            title: highlightMemoryDoc.title,
            content: highlightMemoryDoc.content,
            excerpt: buildExcerpt(highlightMemoryDoc.content, 220),
            createdAt: highlightMemoryDoc.created_at,
            authorName: highlightMemoryDoc.createdBy ? `${highlightMemoryDoc.createdBy.firstName} ${highlightMemoryDoc.createdBy.lastName}` : 'Unknown',
            coverImage: coverImg ? coverImg.photoUrl : null,
            gallery: [],
            taggedStudents: []
        };
    }

    const studentSpotlight = await Student.find({ graduationYear: yearbook._id })
        .sort({ updated_at: -1, lastName: 1 }).limit(12).lean();

    const memorySpotlightDocs = await Memory.find({ createdBy: { $in: studentIds } })
        .sort({ created_at: -1 }).limit(6).populate('createdBy', 'firstName lastName').lean();
        
    const memorySpotlightIds = memorySpotlightDocs.map(m => String(m._id));
    const allImages = await Image.find({ entityType: 'memory', entityId: { $in: memorySpotlightIds } }).sort({ sortOrder: 1 }).lean();
    
    // Resolve tagged students natively in memory
    const memorySpotlight = memorySpotlightDocs.map(m => {
        const mImgs = allImages.filter(i => i.entityId === String(m._id)).map(i => ({ id: i._id, url: i.photoUrl, sort: i.sortOrder }));
        const tags = (m.participants || []).map(p => p.studentId); // In full system we'd resolve these via Student.find
        
        return {
            id: m._id,
            title: m.title,
            content: m.content,
            excerpt: buildExcerpt(m.content, 220),
            createdAt: m.created_at,
            authorName: m.createdBy ? `${m.createdBy.firstName} ${m.createdBy.lastName}` : 'Unknown',
            coverImage: mImgs[0] ? mImgs[0].url : null,
            gallery: mImgs,
            taggedStudents: tags 
        };
    });

    const albums = await Album.find({ createdBy: { $in: studentIds } })
        .sort({ created_at: -1 }).limit(6).populate('createdBy', 'firstName lastName').lean();

    return res.status(200).json({
      batch: {
        graduationYear,
        entryYear,
        label,
        theme: yearbook.theme || null,
      },
      stats: {
        studentCount,
        memoryCount,
        topDepartments: departmentBreakdown.slice(0, 5),
        lastMemoryAt: latestMemory ? latestMemory.created_at : null,
      },
      highlightMemory,
      studentSpotlight: studentSpotlight.map(row => ({
        studentId: row.studentId,
        firstName: row.firstName,
        lastName: row.lastName,
        department: row.department,
        photoUrl: row.photoUrl,
        bio: row.bio,
        motto: row.motto,
      })),
      memorySpotlight: memorySpotlight,
      albums: albums.map(row => ({
        id: row._id,
        title: row.title,
        description: row.description,
        createdAt: row.created_at,
        createdByName: row.createdBy ? `${row.createdBy.firstName} ${row.createdBy.lastName}` : 'Unknown',
      })),
    });
  } catch (error) {
    console.error("Batch Detail Error:", error);
    return res.status(500).json({ error: "Failed to load batch overview." });
  }
};
