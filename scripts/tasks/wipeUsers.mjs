import User from "../../backend/src/models/User.js";
import Student from "../../backend/src/models/Student.js";
import OtpVerification from "../../backend/src/models/OtpVerification.js";
import Club from "../../backend/src/models/Club.js";
import Memory from "../../backend/src/models/Memory.js";
import TagNotification from "../../backend/src/models/TagNotification.js";
import ActivityNotification from "../../backend/src/models/ActivityNotification.js";
import Yearbook from "../../backend/src/models/Yearbook.js";
import Department from "../../backend/src/models/Department.js";

const models = [
  TagNotification,
  ActivityNotification,
  Memory,
  User,
  Student,
  OtpVerification,
  Club,
  Yearbook,
  Department
];

export async function wipeUsers() {
  try {
    for (const model of models) {
      const result = await model.deleteMany({});
      console.log(` - ${model.modelName}: ${result.deletedCount} documents removed`);
    }
  } catch (error) {
    throw error;
  }
}

export default wipeUsers;
