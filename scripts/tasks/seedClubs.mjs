import Club from "../../backend/src/models/Club.js";

const clubs = [
  { code: "IUTCS", name: "Computer Society", description: "Coding contests and mentoring." },
  { code: "IUTPS", name: "Photography Society", description: "Photo walks and exhibitions." },
  { code: "IUTDS", name: "Debating Society", description: "Parliamentary and BP debating." },
];

export async function seedClubs() {
  try {
    for (const club of clubs) {
      await Club.findOneAndUpdate(
        { code: club.code },
        { 
          name: club.name, 
          description: club.description 
        },
        { upsert: true, new: true }
      );
      console.log(` - ensured club ${club.code}`);
    }
  } catch (error) {
    throw error;
  }
}

export default seedClubs;
