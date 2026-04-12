import DigitalYearbook from '../models/DigitalYearbook.js';
import Memory from '../models/Memory.js';
import mongoose from 'mongoose';

export const getPotentialYearbookPosts = async (req, res) => {
  try {
    const { privacyType, targetId, startDate, endDate } = req.query;

    if (!privacyType || !targetId || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing required query parameters" });
    }

    // Base query for privacy and timeframe
    const query = {
      created_at: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: 'approved'
    };

    if (privacyType === 'club') {
      query.clubCode = targetId;
    } else if (privacyType === 'department') {
      query.department = targetId;
    } else if (privacyType === 'batch') {
      query.batch = Number(targetId);
    }

    // Exclude existing yearbooks (since they are also "published" memories)
    // We assume DigitalYearbooks are not in the Memory model 
    // but if we were storing them as memories we'd filter by a type field.
    
    const memories = await Memory.find(query)
      .sort({ created_at: 1 })
      .lean();

    res.json(memories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createYearbook = async (req, res) => {
  try {
    const { title, description, coverImageUrl, privacyType, targetId, memoryIds } = req.body;
    
    const yearbook = await DigitalYearbook.create({
      title,
      description,
      coverImageUrl,
      privacyType,
      targetId,
      pages: memoryIds.map(id => ({ memoryId: id })),
      createdBy: req.user.userId,
      isPublished: true,
      publishedAt: new Date()
    });

    res.status(201).json(yearbook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getYearbookById = async (req, res) => {
  try {
    const { id } = req.params;
    const yearbook = await DigitalYearbook.findById(id)
      .populate({
        path: 'pages.memoryId',
        populate: { path: 'participants.studentId' }
      })
      .lean();

    if (!yearbook) {
      return res.status(404).json({ error: "Yearbook not found" });
    }

    // Basic privacy check (user should belong to the group)
    // For simplicity, we assume frontend or middleware handles specific user group checks 
    // but we can add more robust checks here.

    res.json(yearbook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
