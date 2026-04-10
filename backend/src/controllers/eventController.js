import cloudinary from "../config/cloudinary.js";
import Event from "../models/Event.js";
import EventPost from "../models/EventPost.js";
import EventSubscription from "../models/EventSubscription.js";
import Bookmark from "../models/Bookmark.js";
import Follow from "../models/Follow.js";
import Image from "../models/Image.js";
import User from "../models/User.js";

const EVENT_SCOPES = new Set(["global", "department", "club"]);

const uploadBufferToCloudinary = (buffer, folder = "iut-yearbook/events") =>
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

const coerceDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export const listEvents = async (req, res) => {
  const { scope, page = 1, limit = 20 } = req.query;
  const pageSize = Math.min(Math.max(Number(limit) || 20, 5), 50);
  const currentPage = Math.max(Number(page) || 1, 1);
  const offset = (currentPage - 1) * pageSize;

  const query = {};
  if (scope && EVENT_SCOPES.has(scope)) {
      query.scope = scope;
  }

  try {
      const [events, total] = await Promise.all([
          Event.find(query)
            // Complex sort: start_time IS NULL (meaning later), then start_time ASC, then created_at DESC
            // Mongoose handles this somewhat differently to SQL, but we can approximate:
            .sort({ startTime: 1, created_at: -1 })
            .limit(pageSize)
            .skip(offset)
            .lean(),
          Event.countDocuments(query)
      ]);

      res.json({
        events,
        pagination: {
          total,
          page: currentPage,
          limit: pageSize,
        },
      });
  } catch(error) {
      console.error("List events error", error);
      res.status(500).json({ error: "Failed to list events" });
  }
};

export const createEvent = async (req, res) => {
  const {
    title,
    description,
    scope = "global",
    scopeRef,
    startTime,
    endTime,
    location,
  } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }

  if (!EVENT_SCOPES.has(scope)) {
    return res.status(400).json({ error: "Invalid scope" });
  }

  let coverPhotoUrl = req.body.coverPhotoUrl?.trim() || null;

  try {
    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
      coverPhotoUrl = uploadResult.secure_url;
    }

    const event = await Event.create({
        title: title.trim(),
        description: description?.trim() || null,
        coverPhotoUrl,
        scope,
        scopeRef: scopeRef?.trim() || null,
        startTime: coerceDate(startTime),
        endTime: coerceDate(endTime),
        location: location?.trim() || null,
        createdBy: req.user.userId
    });

    res.status(201).json({ event });
  } catch (error) {
    console.error("Create event error", error);
    res.status(500).json({ error: "Failed to create event" });
  }
};

export const updateEvent = async (req, res) => {
  const { eventId } = req.params;
  const {
    title,
    description,
    scope,
    scopeRef,
    startTime,
    endTime,
    location,
    coverPhotoUrl,
  } = req.body;

  if (scope && !EVENT_SCOPES.has(scope)) {
    return res.status(400).json({ error: "Invalid scope" });
  }

  try {
    let resolvedCover = coverPhotoUrl?.trim() || null;
    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
      resolvedCover = uploadResult.secure_url;
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (resolvedCover !== null) updateData.coverPhotoUrl = resolvedCover;
    if (scope !== undefined) updateData.scope = scope;
    if (scopeRef !== undefined) updateData.scopeRef = scopeRef.trim();
    if (startTime !== undefined) updateData.startTime = coerceDate(startTime);
    if (endTime !== undefined) updateData.endTime = coerceDate(endTime);
    if (location !== undefined) updateData.location = location.trim();

    const event = await Event.findByIdAndUpdate(eventId, { $set: updateData }, { new: true });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json({ event });
  } catch (error) {
    console.error("Update event error", error);
    res.status(500).json({ error: "Failed to update event" });
  }
};

export const deleteEvent = async (req, res) => {
  const { eventId } = req.params;

  try {
    const event = await Event.findByIdAndDelete(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json({ message: "Event removed" });
  } catch (error) {
    console.error("Delete event error", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
};

export const createEventPost = async (req, res) => {
  const { eventId } = req.params;
  const { title, body } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }

  try {
    const event = await Event.findById(eventId).select('_id');
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const post = await EventPost.create({
        eventId,
        title: title.trim(),
        body: body?.trim() || null,
        createdBy: req.user.userId
    });

    if (req.files?.length) {
      const uploadPromises = req.files.map((file, index) =>
        uploadBufferToCloudinary(file.buffer, "iut-yearbook/event-posts").then((result) => ({
          url: result.secure_url,
          sort: index,
        })),
      );

      const uploads = await Promise.all(uploadPromises);

      if (uploads.length) {
        await Promise.all(uploads.map(upload =>
            Image.create({
                entityType: 'event_post',
                entityId: post._id,
                photoUrl: upload.url,
                sortOrder: upload.sort
            })
        ));
      }
    }

    res.status(201).json({ post });
  } catch (error) {
    console.error("Create event post error", error);
    res.status(500).json({ error: "Failed to create event post" });
  }
};

export const listEventPosts = async (req, res) => {
  const { eventId } = req.params;

  try {
    const postsResult = await EventPost.find({ eventId })
        .sort({ created_at: -1 })
        .populate('createdBy', 'displayName')
        .lean();

    const postIds = postsResult.map(p => p._id);
    const images = await Image.find({ entityType: 'event_post', entityId: { $in: postIds.map(String) } }).sort({ sortOrder: 1 });

    const posts = postsResult.map(post => {
        const postImages = images.filter(i => i.entityId === String(post._id)).map(i => ({
            id: i._id,
            url: i.photoUrl,
            sort: i.sortOrder
        }));
        return {
            ...post,
            author_name: post.createdBy?.displayName,
            images: postImages
        };
    });

    res.json({ posts });
  } catch (error) {
    console.error("List event posts error", error);
    res.status(500).json({ error: "Failed to load posts" });
  }
};

export const subscribeEvent = async (req, res) => {
  const { eventId } = req.params;

  try {
    const event = await Event.findById(eventId).select('_id');
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    await EventSubscription.findOneAndUpdate(
        { eventId, userId: req.user.userId },
        {},
        { upsert: true, new: true }
    );

    res.json({ message: "Subscribed" });
  } catch (error) {
    console.error("Subscribe event error", error);
    res.status(500).json({ error: "Failed to subscribe" });
  }
};

export const unsubscribeEvent = async (req, res) => {
  const { eventId } = req.params;

  try {
    await EventSubscription.findOneAndDelete({ eventId, userId: req.user.userId });
    res.json({ message: "Unsubscribed" });
  } catch (error) {
    console.error("Unsubscribe event error", error);
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
};

export const bookmarkEntity = async (req, res) => {
  const { entityType, entityId } = req.body;
  const allowed = new Set(["memory", "event", "event_post"]);

  if (!allowed.has(entityType)) {
    return res.status(400).json({ error: "Invalid entity" });
  }

  try {
    await Bookmark.findOneAndUpdate(
        { userId: req.user.userId, entityType, entityId },
        {},
        { upsert: true, new: true }
    );
    res.json({ message: "Bookmarked" });
  } catch (error) {
    console.error("Bookmark error", error);
    res.status(500).json({ error: "Failed to bookmark" });
  }
};

export const removeBookmark = async (req, res) => {
  const { entityType, entityId } = req.body;

  try {
    await Bookmark.findOneAndDelete({ userId: req.user.userId, entityType, entityId });
    res.json({ message: "Bookmark removed" });
  } catch (error) {
    console.error("Remove bookmark error", error);
    res.status(500).json({ error: "Failed to remove bookmark" });
  }
};

export const listBookmarks = async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ userId: req.user.userId }).sort({ created_at: -1 });
    res.json({ bookmarks });
  } catch (error) {
    console.error("List bookmarks error", error);
    res.status(500).json({ error: "Failed to load bookmarks" });
  }
};

export const followUser = async (req, res) => {
  const { targetUserId } = req.params;

  if (targetUserId === req.user.userId) {
    return res.status(400).json({ error: "Cannot follow yourself" });
  }

  try {
    const target = await User.findById(targetUserId).select('_id');
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }

    await Follow.findOneAndUpdate(
        { followerId: req.user.userId, followingId: targetUserId },
        {},
        { upsert: true }
    );

    res.json({ message: "Following" });
  } catch (error) {
    console.error("Follow error", error);
    res.status(500).json({ error: "Failed to follow" });
  }
};

export const unfollowUser = async (req, res) => {
  const { targetUserId } = req.params;

  try {
    await Follow.findOneAndDelete({ followerId: req.user.userId, followingId: targetUserId });
    res.json({ message: "Unfollowed" });
  } catch (error) {
    console.error("Unfollow error", error);
    res.status(500).json({ error: "Failed to unfollow" });
  }
};

export const listFollowing = async (req, res) => {
  const { userId } = req.params;

  try {
    const follows = await Follow.find({ followerId: userId || req.user.userId }).populate('followingId', 'displayName email avatarUrl');
    
    // Assuming we want to map this to an array of following users
    const following = follows.map(f => {
       const u = f.followingId;
       return u ? { id: u._id, display_name: u.displayName, email: u.email, avatar_url: u.avatarUrl } : null;
    }).filter(Boolean);

    res.json({ following });
  } catch (error) {
    console.error("List following error", error);
    res.status(500).json({ error: "Failed to load following" });
  }
};

export const listFollowers = async (req, res) => {
  const { userId } = req.params;

  try {
    const follows = await Follow.find({ followingId: userId || req.user.userId }).populate('followerId', 'displayName email avatarUrl');
    
    const followers = follows.map(f => {
       const u = f.followerId;
       return u ? { id: u._id, display_name: u.displayName, email: u.email, avatar_url: u.avatarUrl } : null;
    }).filter(Boolean);

    res.json({ followers });
  } catch (error) {
    console.error("List followers error", error);
    res.status(500).json({ error: "Failed to load followers" });
  }
};
