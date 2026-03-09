import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../backend/src/models/Student.js';
import Memory from '../backend/src/models/Memory.js';
import { connectDB } from '../backend/src/config/database.js';

dotenv.config();

async function getPopularStudents() {
  try {
    await connectDB();
    console.log('Connected to database. Calculating popularity...');

    // Popularity is defined by the number of reactions across all memories a student is associated with
    // or simply the number of reactions they've received on their own memories.
    // Let's go with reactions on memories created by the student + reactions on memories they are participants in.

    const popularityData = await Memory.aggregate([
      { $unwind: '$reactions' },
      // We want to count reactions for the creator and participants
      {
        $facet: {
          creatorReactions: [
            { $group: { _id: '$createdBy', count: { $sum: 1 } } }
          ],
          participantReactions: [
            { $unwind: '$participants' },
            { $group: { _id: '$participants.studentId', count: { $sum: 1 } } }
          ]
        }
      },
      {
        $project: {
          allReactions: { $concatArrays: ['$creatorReactions', '$participantReactions'] }
        }
      },
      { $unwind: '$allReactions' },
      {
        $group: {
          _id: '$allReactions._id',
          totalReactions: { $sum: '$allReactions.count' }
        }
      },
      { $sort: { totalReactions: -1 } },
      { $limit: 10 }
    ]);

    if (popularityData.length === 0) {
      console.log('No reaction data found.');
      process.exit(0);
    }

    console.log('\nTop 10 Popular Students:');
    console.log('-------------------------');

    for (const item of popularityData) {
      const student = await Student.findOne({ studentId: item._id });
      const name = student ? `${student.firstName} ${student.lastName}` : 'Unknown Student';
      console.log(`${name} (${item._id}): ${item.totalReactions} reactions`);
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('Error fetching popular students:', error);
    process.exit(1);
  }
}

getPopularStudents();
