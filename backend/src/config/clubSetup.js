import Club from '../models/Club.js';

const DEFAULT_CLUBS = [
  {
    code: "IUTCS",
    name: "Computer Society",
    description: "Coding contests, hack nights, & mentoring for aspiring engineers.",
  },
  {
    code: "IUTPS",
    name: "Photography Society",
    description: "Storytelling through lenses, workshops, & photo walks around campus.",
  },
  {
    code: "IUTSIKS",
    name: "Society of Islamic Knowledge Seekers",
    description: "Weekly halaqas & initiatives that deepen spiritual underst&ing.",
  },
  {
    code: "IUTDS",
    name: "Debating Society",
    description: "Parliamentary debates, public speaking, & adjudication training programs.",
  },
  {
    code: "IUTMOIC",
    name: "Model Organization of Islamic Countries",
    description: "Diplomacy simulations focused on the OIC's global priorities.",
  },
];

export const ensureClubSetup = async () => {
  for (const club of DEFAULT_CLUBS) {
    await Club.findOneAndUpdate(
      { code: club.code },
      { $set: { name: club.name, description: club.description } },
      { upsert: true, new: true, returnDocument: 'after' }
    );
  }
};

export default DEFAULT_CLUBS;
