import Club from '../models/Club.js';
import User from '../models/User.js';

const buildStudentSummary = (student) =>
  student
    ? {
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        department: student.department,
        graduationYear: student.graduationYear?.year || student.graduationYear,
        photoUrl: student.photoUrl,
      }
    : null;

export const listClubs = async (req, res) => {
  try {
    const clubsResult = await Club.find().populate({
      path: 'members.studentId',
      select: 'studentId firstName lastName department graduationYear photoUrl',
      populate: { path: 'graduationYear' }
    }).sort({ name: 1 });

    const clubs = clubsResult.map(c => {
      const sortedMembers = [...c.members].sort((a, b) => b.joinedAt - a.joinedAt);
      const recentMembers = sortedMembers.map(m => buildStudentSummary(m.studentId)).filter(Boolean);
      
      return {
        id: c._id,
        code: c.code,
        name: c.name,
        description: c.description,
        members: {
          count: c.members.length,
          recentMembers: recentMembers
        }
      };
    });

    res.json({ clubs });
  } catch (error) {
    console.error("List Clubs Error:", error);
    res.status(500).json({ error: "Failed to load clubs." });
  }
};

export const joinClub = async (req, res) => {
  const { userId } = req.user;
  const { clubCode } = req.params;

  if (!clubCode) {
    return res.status(400).json({ error: "Club code is required." });
  }

  try {
    const user = await User.findById(userId).populate({
        path: 'studentId',
        populate: { path: 'graduationYear' }
    });
    if (!user || !user.studentId) {
      return res.status(400).json({ error: "Link a student profile before joining clubs." });
    }
    const student = user.studentId;

    const club = await Club.findOne({ code: clubCode });
    if (!club) {
      return res.status(404).json({ error: "Club not found." });
    }

    // Add member if not exists
    const isMember = club.members.some(m => String(m.studentId) === String(student._id));
    if (!isMember) {
        club.members.push({ studentId: student._id });
        await club.save();
    }

    res.status(201).json({
      message: `Joined ${club.name}.`,
      membership: {
        clubId: club._id,
        clubCode,
        memberCount: club.members.length,
        member: buildStudentSummary(student),
      },
    });
  } catch (error) {
    console.error("Join Club Error:", error);
    res.status(500).json({ error: "Failed to join club." });
  }
};

export const leaveClub = async (req, res) => {
  const { userId } = req.user;
  const { clubCode } = req.params;

  if (!clubCode) {
    return res.status(400).json({ error: "Club code is required." });
  }

  try {
    const user = await User.findById(userId).populate('studentId');
    if (!user || !user.studentId) {
      return res.status(400).json({ error: "Link a student profile before leaving clubs." });
    }
    const studentId = user.studentId._id;

    const club = await Club.findOne({ code: clubCode });
    if (!club) {
      return res.status(404).json({ error: "Club not found." });
    }

    const initialLength = club.members.length;
    club.members = club.members.filter(m => String(m.studentId) !== String(studentId));

    if (club.members.length === initialLength) {
      return res.status(404).json({ error: "You are not a member of this club." });
    }

    await club.save();

    res.json({
      message: `Left ${club.name}.`,
      membership: {
        clubId: club._id,
        clubCode,
        memberCount: club.members.length,
      },
    });
  } catch (error) {
    console.error("Leave Club Error:", error);
    res.status(500).json({ error: "Failed to leave club." });
  }
};

export const myClubs = async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await User.findById(userId).populate('studentId');
    if (!user || !user.studentId) {
      return res.status(400).json({ error: "Link a student profile before viewing clubs." });
    }
    const studentId = user.studentId._id;

    const clubsResult = await Club.find({ 'members.studentId': studentId }).lean();

    const clubs = clubsResult.map(c => {
      const membership = c.members.find(m => String(m.studentId) === String(studentId));
      return {
        id: c._id,
        code: c.code,
        name: c.name,
        description: c.description,
        joined_at: membership ? membership.joinedAt : null
      };
    }).sort((a, b) => new Date(b.joined_at) - new Date(a.joined_at));

    res.json({ clubs });
  } catch (error) {
    console.error("My Clubs Error:", error);
    res.status(500).json({ error: "Failed to load memberships." });
  }
};
