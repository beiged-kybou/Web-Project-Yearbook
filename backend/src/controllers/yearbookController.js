import cloudinary from "../config/cloudinary.js";
import YearbookRelease from "../models/YearbookRelease.js";
import YearbookPage from "../models/YearbookPage.js";
import YearbookPagePost from "../models/YearbookPagePost.js";
import Image from "../models/Image.js";
import Memory from "../models/Memory.js";
import EventPost from "../models/EventPost.js";
import Department from "../models/Department.js";
import Club from "../models/Club.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import Album from "../models/Album.js";
import mongoose from "mongoose";

const PAGE_OWNER_TYPES = new Set(["department", "club", "individual", "admin"]);
const RELEASE_STATUSES = new Set(["draft", "collecting", "final", "published"]);

const uploadBufferToCloudinary = (buffer, folder = "iut-yearbook/yearbooks") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) { reject(error); return; }
        resolve(result);
      }
    );
    stream.end(buffer);
  });

const snapshotMemory = async (memoryId) => {
  const memory = await Memory.findById(memoryId).populate('createdBy', 'firstName lastName department');
  if (!memory) return null;

  return {
    id: memory._id,
    title: memory.title,
    body: memory.content,
    createdAt: memory.created_at,
    authorName: memory.createdBy ? `${memory.createdBy.firstName} ${memory.createdBy.lastName}` : null,
    department: memory.createdBy?.department,
  };
};

const snapshotEventPost = async (postId) => {
  const post = await EventPost.findById(postId).populate('eventId', 'title');
  if (!post) return null;

  return {
    id: post._id,
    title: post.title,
    body: post.body,
    createdAt: post.created_at,
    eventTitle: post.eventId?.title,
  };
};

const seedDefaultPages = async (releaseId) => {
  const [departments, clubs] = await Promise.all([
    Department.find().sort({ code: 1 }),
    Club.find().sort({ code: 1 })
  ]);

  let pageNumber = 1;
  const pages = [];

  const pushPages = (ownerType, ownerRef, titlePrefix) => {
    for (let i = 0; i < 3; i += 1) {
      pages.push({
        releaseId,
        pageNumber,
        ownerType,
        ownerRef,
        title: `${titlePrefix} · Page ${i + 1}`,
      });
      pageNumber += 1;
    }
  };

  departments.forEach((dept) => pushPages("department", dept.code, `${dept.code} Department`));
  clubs.forEach((club) => pushPages("club", club.code, `${club.code} Club`));

  if (pages.length) {
    await YearbookPage.insertMany(pages);
  }
};

const loadPageWithAssets = async (pageId) => {
  const page = await YearbookPage.findById(pageId).populate('releaseId', 'status').lean();
  if (!page) return null;

  const images = await Image.find({ entityType: 'yearbook_page', entityId: String(pageId) }).sort({ sortOrder: 1 }).lean();
  const posts = await YearbookPagePost.find({ pageId }).lean();

  return {
    ...page,
    release_status: page.releaseId?.status,
    images: images.map(i => ({ id: i._id, url: i.photoUrl, sort: i.sortOrder })),
    attachments: posts.map(p => ({
      id: p._id,
      type: p.entityType,
      entityId: p.entityId,
      snapshot: p.snapshot
    }))
  };
};

const canEditPage = (page, user) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (page.assignedUserId && String(page.assignedUserId) === String(user.userId)) return true;
  if (page.assigned_user_id && String(page.assigned_user_id) === String(user.userId)) return true; // backwards compatibility check
  return false;
};

const canViewPage = (page, user) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (page.assignedUserId && String(page.assignedUserId) === String(user.userId)) return true;
  if (page.assigned_user_id && String(page.assigned_user_id) === String(user.userId)) return true;
  return false;
};

export const listReleases = async (req, res) => {
  const { status } = req.query;
  const query = {};
  if (status && RELEASE_STATUSES.has(status)) {
    query.status = status;
  }

  try {
    const releases = await YearbookRelease.find(query).sort({ year: -1, created_at: -1 }).lean();
    res.json({ releases: releases.map(r => ({ ...r, id: r._id })) });
  } catch (error) {
    console.error("List releases error", error);
    res.status(500).json({ error: "Failed to load releases" });
  }
};

export const listPublishedReleases = async (req, res) => {
  try {
    const releases = await YearbookRelease.find({ status: 'published' }).sort({ year: -1 }).lean();
    res.json({ releases: releases.map(r => ({ ...r, id: r._id })) });
  } catch (error) {
    res.status(500).json({ error: "Failed to load published releases" });
  }
};

export const createRelease = async (req, res) => {
  const { title, year, theme, introText } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: "Title is required" });
  if (!year || Number.isNaN(Number(year))) return res.status(400).json({ error: "Valid year is required" });

  try {
    const existing = await YearbookRelease.findOne({ year: Number(year) });
    if (existing) return res.status(409).json({ error: "A release already exists for this year" });

    let coverPhotoUrl = req.body.coverPhotoUrl?.trim() || null;
    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer, "iut-yearbook/releases");
      coverPhotoUrl = uploadResult.secure_url;
    }

    const release = await YearbookRelease.create({
      title: title.trim(),
      year: Number(year),
      theme: theme?.trim() || null,
      introText: introText?.trim() || null,
      coverPhotoUrl,
      createdBy: req.user.userId
    });

    await seedDefaultPages(release._id);
    res.status(201).json({ release });
  } catch (error) {
    console.error("Create release error", error);
    res.status(500).json({ error: "Failed to create release" });
  }
};

export const updateReleaseStatus = async (req, res) => {
  const { releaseId } = req.params;
  const { status } = req.body;

  if (!RELEASE_STATUSES.has(status)) return res.status(400).json({ error: "Invalid status" });

  try {
    const update = { status, updated_at: new Date() };
    if (status === 'published') update.publishedAt = new Date();

    const release = await YearbookRelease.findByIdAndUpdate(releaseId, { $set: update }, { new: true });
    if (!release) return res.status(404).json({ error: "Release not found" });

    res.json({ release });
  } catch (error) {
    res.status(500).json({ error: "Failed to update status" });
  }
};

export const assignPageOwner = async (req, res) => {
  const { pageId } = req.params;
  const { ownerType, ownerRef, assignedUserId, title } = req.body;

  if (ownerType && !PAGE_OWNER_TYPES.has(ownerType)) {
    return res.status(400).json({ error: "Invalid owner type" });
  }

  try {
    const update = { updated_at: new Date() };
    if (ownerType !== undefined) update.ownerType = ownerType;
    if (ownerRef !== undefined) update.ownerRef = ownerRef?.trim() || null;
    if (assignedUserId !== undefined) update.assignedUserId = assignedUserId || null;
    if (title !== undefined) update.title = title?.trim() || null;

    const page = await YearbookPage.findByIdAndUpdate(pageId, { $set: update }, { new: true });
    if (!page) return res.status(404).json({ error: "Page not found" });

    res.json({ page });
  } catch (error) {
    res.status(500).json({ error: "Failed to assign page" });
  }
};

export const listReleasePages = async (req, res) => {
  const { releaseId } = req.params;

  try {
    const release = await YearbookRelease.findById(releaseId).select('title year status');
    if (!release) return res.status(404).json({ error: "Release not found" });

    const pages = await YearbookPage.find({ releaseId }).sort({ pageNumber: 1 }).populate('assignedUserId', 'displayName').lean();

    res.json({ 
        release: { id: release._id, title: release.title, year: release.year, status: release.status }, 
        pages: pages.map(p => ({ ...p, assignee_name: p.assignedUserId?.displayName }))
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load pages" });
  }
};

export const listMyPages = async (req, res) => {
  try {
    const pagesResult = await YearbookPage.find({ assignedUserId: req.user.userId })
        .populate('releaseId')
        .sort({ 'releaseId.year': -1, pageNumber: 1 })
        .lean();

    const formattedPages = [];
    for (const page of pagesResult) {
        const loaded = await loadPageWithAssets(page._id);
        if (loaded) {
            loaded.release_title = page.releaseId?.title;
            loaded.year = page.releaseId?.year;
            formattedPages.push(loaded);
        }
    }

    res.json({ pages: formattedPages });
  } catch (error) {
    res.status(500).json({ error: "Failed to load assigned pages" });
  }
};

export const updatePageContent = async (req, res) => {
  const { pageId } = req.params;
  const { layout, content } = req.body;

  try {
    const page = await loadPageWithAssets(pageId);
    if (!page) return res.status(404).json({ error: "Page not found" });
    if (!canEditPage(page, req.user)) return res.status(403).json({ error: "Not allowed to edit this page" });

    const update = { updated_at: new Date() };
    if (layout) update.layout = layout;
    if (content) update.content = content;
    if (page.status === 'approved') update.status = 'submitted';

    await YearbookPage.findByIdAndUpdate(pageId, { $set: update });
    const reloaded = await loadPageWithAssets(pageId);

    res.json({ page: reloaded });
  } catch (error) {
    res.status(500).json({ error: "Failed to update page" });
  }
};

export const submitPage = async (req, res) => {
  const { pageId } = req.params;

  try {
    const page = await YearbookPage.findById(pageId).lean();
    if (!page) return res.status(404).json({ error: "Page not found" });
    if (!canEditPage(page, req.user)) return res.status(403).json({ error: "Not allowed to submit this page" });

    const update = await YearbookPage.findByIdAndUpdate(
        pageId, 
        { $set: { status: 'submitted', submittedAt: new Date(), submittedBy: req.user.userId, updated_at: new Date() } },
        { new: true }
    );

    res.json({ page: update });
  } catch (error) {
    res.status(500).json({ error: "Failed to submit page" });
  }
};

export const approvePage = async (req, res) => {
  const { pageId } = req.params;

  try {
    const update = await YearbookPage.findByIdAndUpdate(
        pageId,
        { $set: { status: 'approved', approvedAt: new Date(), approvedBy: req.user.userId, updated_at: new Date() } },
        { new: true }
    );

    if (!update) return res.status(404).json({ error: "Page not found" });

    res.json({ page: update });
  } catch (error) {
    res.status(500).json({ error: "Failed to approve page" });
  }
};

export const uploadPageImage = async (req, res) => {
  const { pageId } = req.params;

  if (!req.file) return res.status(400).json({ error: "Image file required" });

  try {
    const page = await loadPageWithAssets(pageId);
    if (!page) return res.status(404).json({ error: "Page not found" });
    if (!canEditPage(page, req.user)) return res.status(403).json({ error: "Not allowed to upload to this page" });

    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, "iut-yearbook/yearbook-pages");

    const highestSort = await Image.findOne({ entityType: 'yearbook_page', entityId: String(pageId) }).sort({ sortOrder: -1 }).select('sortOrder');
    const nextSort = highestSort ? highestSort.sortOrder + 1 : 0;

    const image = await Image.create({
        entityType: 'yearbook_page',
        entityId: String(pageId),
        photoUrl: uploadResult.secure_url,
        sortOrder: nextSort
    });

    const updatedPage = await loadPageWithAssets(pageId);

    res.status(201).json({ image: { id: image._id, photo_url: image.photoUrl, sort_order: image.sortOrder }, page: updatedPage });
  } catch (error) {
    res.status(500).json({ error: "Failed to upload image" });
  }
};

export const addPostToPage = async (req, res) => {
  const { pageId } = req.params;
  const { entityType, entityId } = req.body;

  if (!["memory", "event_post"].includes(entityType)) return res.status(400).json({ error: "Invalid entity type" });

  try {
    const page = await loadPageWithAssets(pageId);
    if (!page) return res.status(404).json({ error: "Page not found" });
    if (!canEditPage(page, req.user)) return res.status(403).json({ error: "Not allowed to edit this page" });

    const snapshot = entityType === "memory" ? await snapshotMemory(entityId) : await snapshotEventPost(entityId);
    if (!snapshot) return res.status(404).json({ error: "Referenced content not found" });

    const attachment = await YearbookPagePost.findOneAndUpdate(
        { pageId, entityType, entityId },
        { $set: { snapshot } },
        { upsert: true, new: true }
    );

    const updatedPage = await loadPageWithAssets(pageId);
    res.status(201).json({ attachment, page: updatedPage });
  } catch (error) {
    res.status(500).json({ error: "Failed to attach post" });
  }
};

export const removePostFromPage = async (req, res) => {
  const { pageId, attachmentId } = req.params;

  try {
    const page = await loadPageWithAssets(pageId);
    if (!page) return res.status(404).json({ error: "Page not found" });
    if (!canEditPage(page, req.user)) return res.status(403).json({ error: "Not allowed" });

    await YearbookPagePost.findOneAndDelete({ _id: attachmentId, pageId });

    const updatedPage = await loadPageWithAssets(pageId);
    res.json({ message: "Removed", page: updatedPage });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove attachment" });
  }
};

export const getPublishedRelease = async (req, res) => {
  const { releaseId } = req.params;

  try {
    const release = await YearbookRelease.findOne({ _id: releaseId, status: 'published' }).lean();
    if (!release) return res.status(404).json({ error: "Published release not found" });

    const pagesResult = await YearbookPage.find({ releaseId }).sort({ pageNumber: 1 }).lean();
    const formattedPages = [];
    
    for (const p of pagesResult) {
        const loaded = await loadPageWithAssets(p._id);
        if (loaded) formattedPages.push(loaded);
    }

    res.json({ release, pages: formattedPages });
  } catch (error) {
    res.status(500).json({ error: "Failed to load flipbook" });
  }
};

export const getPageDetail = async (req, res) => {
  const { pageId } = req.params;

  try {
    const page = await loadPageWithAssets(pageId);
    if (!page) return res.status(404).json({ error: "Page not found" });
    if (!canViewPage(page, req.user)) return res.status(403).json({ error: "Not allowed" });

    res.json({ page });
  } catch (error) {
    res.status(500).json({ error: "Failed to load page" });
  }
};

// Remove the redundant duplicate export that used undefined 'imageSchema'
export const previewPersonalYearbook = async (req, res) => {
  const { privacy, clubCode, startDate, endDate } = req.query;
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId).populate('studentId').lean();
    if (!user || !user.studentId) return res.status(400).json({ error: "Complete your profile first." });

    const creator = user.studentId;
    const query = { status: 'approved' };

    // Apply Time filter
    if (startDate || endDate) {
      query.created_at = {};
      if (startDate) query.created_at.$gte = new Date(startDate);
      if (endDate) query.created_at.$lte = new Date(endDate);
    }

    // Apply Privacy filter
    if (privacy === 'department') {
      const album = await Album.findOne({ type: 'department', title: 'Department Memories' });
      if (album) query.albumId = album._id;
    } else if (privacy === 'batch') {
      const album = await Album.findOne({ type: 'batch', title: 'Batch Memories' });
      if (album) query.albumId = album._id;
    } else if (privacy === 'club') {
      if (!clubCode) return res.status(400).json({ error: "clubCode is required for club privacy." });
      const club = await Club.findOne({ code: clubCode });
      if (!club) return res.status(404).json({ error: "Club not found." });
      const album = await Album.findOne({ type: 'club', title: `${club.name} Club Memories` });
      if (album) query.albumId = album._id;
    } else if (privacy === 'public') {
      query.albumId = { $exists: true }; // Generic check, could be more specific
    }

    const memories = await Memory.find(query)
      .sort({ created_at: 1 })
      .lean();

    const memIds = memories.map(m => m._id);
    const images = await Image.find({ entityType: 'memory', entityId: { $in: memIds.map(String) } }).sort({ sortOrder: 1 });
    
    const creatorIds = [...new Set(memories.map(m => m.createdBy))];
    const creators = await Student.find({ studentId: { $in: creatorIds } }).select('studentId firstName lastName').lean();

    const feed = memories.map(m => {
      const creatorInfo = creators.find(s => s.studentId === m.createdBy);
      return {
        id: m._id,
        title: m.title,
        content: m.content,
        createdAt: m.created_at,
        authorName: creatorInfo ? `${creatorInfo.firstName} ${creatorInfo.lastName}` : "Unknown",
        images: images.filter(i => i.entityId === String(m._id)).map(i => ({ id: i._id, url: i.photoUrl }))
      };
    });

    res.json({ memories: feed });
  } catch (error) {
    console.error("Preview Personal Yearbook Error:", error);
    res.status(500).json({ error: "Failed to generate preview." });
  }
};

export const createPersonalYearbook = async (req, res) => {
  const { title, privacy, clubCode, startDate, endDate, memoryIds } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: "Title is required" });
  if (!memoryIds || !Array.isArray(memoryIds) || memoryIds.length === 0) {
    return res.status(400).json({ error: "At least one memory is required." });
  }

  try {
    const user = await User.findById(req.user.userId).populate('studentId').lean();
    let coverPhotoUrl = null;
    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer, "iut-yearbook/personal-yearbooks");
      coverPhotoUrl = uploadResult.secure_url;
    }

    const release = await YearbookRelease.create({
      title: title.trim(),
      year: new Date().getFullYear(),
      theme: "Personal",
      coverPhotoUrl,
      status: 'published', // Personal yearbooks are "published" by default for sharing
      privacy,
      clubCode,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      createdBy: req.user.userId,
      studentId: user.studentId.studentId
    });

    // Create pages for each memory
    const pages = [];
    for (let i = 0; i < memoryIds.length; i++) {
      const memoryId = memoryIds[i];
      const memory = await Memory.findById(memoryId).lean();
      if (!memory) continue;

      const page = await YearbookPage.create({
        releaseId: release._id,
        pageNumber: i + 1,
        ownerType: 'individual',
        ownerRef: user.studentId.studentId,
        assignedUserId: req.user.userId,
        title: memory.title,
        status: 'approved'
      });

      // Snapshot the memory for the page
      const snapshot = await snapshotMemory(memoryId);
      await YearbookPagePost.create({
        pageId: page._id,
        entityType: 'memory',
        entityId: memoryId,
        snapshot
      });

      // Copy images to the page
      const memImages = await Image.find({ entityType: 'memory', entityId: String(memoryId) }).sort({ sortOrder: 1 });
      for (let j = 0; j < memImages.length; j++) {
        await Image.create({
          entityType: 'yearbook_page',
          entityId: String(page._id),
          photoUrl: memImages[j].photoUrl,
          sortOrder: j
        });
      }
    }

    res.status(201).json({ releaseId: release._id, message: "Personal yearbook created!" });
  } catch (error) {
    console.error("Create Personal Yearbook Error:", error);
    res.status(500).json({ error: "Failed to create personal yearbook." });
  }
};

export const deletePageImage = async (req, res) => {
  const { pageId, imageId } = req.params;

  try {
    const page = await loadPageWithAssets(pageId);
    if (!page) return res.status(404).json({ error: "Page not found" });
    if (!canEditPage(page, req.user)) return res.status(403).json({ error: "Not allowed" });

    await Image.findOneAndDelete({ _id: imageId, entityType: 'yearbook_page', entityId: String(pageId) });

    const updatedPage = await loadPageWithAssets(pageId);
    res.json({ message: "Image removed", page: updatedPage });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove image" });
  }
};
