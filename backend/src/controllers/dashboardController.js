import User from "../models/User.js";
import Student from "../models/Student.js";
import Album from "../models/Album.js";
import Memory from "../models/Memory.js";
import TagNotification from "../models/TagNotification.js";
import Image from "../models/Image.js";
import Yearbook from "../models/Yearbook.js";

const fetchMemoriesWithExtras = async (query, limit = 20) => {
  const memories = await Memory.find(query)
    .sort({ created_at: -1 })
    .limit(limit)
    .populate('createdBy', 'firstName lastName studentId')
    .populate('participants.studentId', 'studentId firstName lastName department graduationYear photoUrl')
    .lean();

  const memoryIds = memories.map(m => m._id);

  const imagesPromise = Image.find({ entityType: 'memory', entityId: { $in: memoryIds.map(String) } }).sort({ sortOrder: 1 });
  const pendingTagsPromise = TagNotification.find({ memoryId: { $in: memoryIds }, status: 'pending' })
    .populate('taggedStudentId', 'studentId firstName lastName department graduationYear photoUrl');
    
  const [images, pendingTags] = await Promise.all([imagesPromise, pendingTagsPromise]);

  return memories.map(m => {
    const memImages = images.filter(img => img.entityId === String(m._id)).map(img => ({
        id: img._id, url: img.photoUrl, sort: img.sortOrder
    }));
    
    // Using custom IDs for references inside `Memory` participants
    const taggedStudents = (m.participants || []).map(p => p.studentId);
    
    const memPendingTags = pendingTags
        .filter(pt => String(pt.memoryId) === String(m._id))
        .map(pt => pt.taggedStudentId);

    return {
      id: m._id,
      title: m.title,
      content: m.content,
      album_id: m.albumId,
      created_at: m.created_at,
      created_by_name: m.createdBy ? `${m.createdBy.firstName} ${m.createdBy.lastName}` : null,
      created_by_id: m.createdBy?.studentId,
      images: memImages,
      tagged_students: taggedStudents,
      pending_tags: memPendingTags
    };
  });
};

export const getDashboard = async (req, res) => {
  const { userId } = req.user;

  try {
    const user = await User.findById(userId).populate({
        path: 'studentId'
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const student = user.studentId;
    const department = student?.department;
    
    const graduation_year = student?.graduationYear;

    const batchYear = graduation_year ? graduation_year - 4 : null;
    const batch = batchYear ? String(batchYear).slice(-2) : null;

    // Get arrays of student IDs for fast matching
    const [deptStudents, batchStudents] = await Promise.all([
      department ? Student.find({ department }).select('studentId').lean() : [],
      graduation_year ? Student.find({ graduationYear: graduation_year }).select('studentId').lean() : []
    ]);

    const deptStudentIds = deptStudents.map(s => s.studentId);
    const batchStudentIds = batchStudents.map(s => s.studentId);

    // Fetch Albums
    const [deptAlbums, batchAlbums, publicAlbums] = await Promise.all([
      Album.find({ type: 'department', createdBy: { $in: deptStudentIds } }).sort({ created_at: -1 }).limit(20).populate('createdBy', 'firstName lastName studentId').lean(),
      Album.find({ type: 'batch', createdBy: { $in: batchStudentIds } }).sort({ created_at: -1 }).limit(20).populate('createdBy', 'firstName lastName studentId').lean(),
      Album.find({ type: 'group' }).sort({ created_at: -1 }).limit(20).populate('createdBy', 'firstName lastName studentId').lean(),
    ]);

    const formatAlbum = (a) => ({
      id: a._id,
      title: a.title,
      description: a.description,
      type: a.type,
      created_at: a.created_at,
      created_by_name: a.createdBy ? `${a.createdBy.firstName} ${a.createdBy.lastName}` : null,
      created_by_id: a.createdBy?.studentId
    });

    const formattedDeptAlbums = deptAlbums.map(formatAlbum);
    const formattedBatchAlbums = batchAlbums.map(formatAlbum);
    const formattedPublicAlbums = publicAlbums.map(formatAlbum);

    const allAlbumIds = [
      ...formattedDeptAlbums,
      ...formattedBatchAlbums,
      ...formattedPublicAlbums
    ].map(a => a.id);

    // Fetch Memories inside these Albums
    let memoriesByAlbum = {};
    if (allAlbumIds.length > 0) {
      const albumMemories = await fetchMemoriesWithExtras({ albumId: { $in: allAlbumIds } }, 100);
      for (const mem of albumMemories) {
        if (!memoriesByAlbum[mem.album_id]) memoriesByAlbum[mem.album_id] = [];
        memoriesByAlbum[mem.album_id].push(mem);
      }
    }

    // Fetch memories outside of albums
    const [deptMemories, batchMemories, publicMemories] = await Promise.all([
      fetchMemoriesWithExtras({ albumId: null, createdBy: { $in: deptStudentIds } }, 20),
      fetchMemoriesWithExtras({ albumId: null, createdBy: { $in: batchStudentIds } }, 20),
      fetchMemoriesWithExtras({ albumId: null }, 20)
    ]);

    const attachMemories = (albums) => albums.map(album => ({
      ...album,
      memories: memoriesByAlbum[album.id] || []
    }));

    res.status(200).json({
      user: {
        id: user._id,
        displayName: user.displayName,
        email: user.email,
        studentId: student?.studentId,
        role: user.role,
        avatarUrl: user.avatarUrl,
        firstName: student?.firstName,
        lastName: student?.lastName,
        department,
        graduationYear: graduation_year,
        batch,
      },
      department: {
        code: department,
        albums: attachMemories(formattedDeptAlbums),
        memories: deptMemories,
      },
      batch: {
        year: graduation_year,
        label: batch ? `'${batch}` : null,
        albums: attachMemories(formattedBatchAlbums),
        memories: batchMemories,
      },
      public: {
        label: "Public",
        albums: attachMemories(formattedPublicAlbums),
        memories: publicMemories,
      },
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};
