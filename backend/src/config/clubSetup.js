const DEFAULT_CLUBS = [
  {
    code: "IUTCS",
    name: "Computer Society",
    description: "Coding contests, hack nights, and mentoring for aspiring engineers.",
  },
  {
    code: "IUTPS",
    name: "Photography Society",
    description: "Storytelling through lenses, workshops, and photo walks around campus.",
  },
  {
    code: "IUTSIKS",
    name: "Society of Islamic Knowledge Seekers",
    description: "Weekly halaqas and initiatives that deepen spiritual understanding.",
  },
  {
    code: "IUTDS",
    name: "Debating Society",
    description: "Parliamentary debates, public speaking, and adjudication training programs.",
  },
  {
    code: "IUTMOIC",
    name: "Model Organization of Islamic Countries",
    description: "Diplomacy simulations focused on the OIC's global priorities.",
  },
];

export const ensureClubSetup = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clubs (
      id SERIAL PRIMARY KEY,
      code VARCHAR(32) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS club_members (
      club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      student_id VARCHAR(32) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (club_id, student_id)
    )
  `);

  for (const club of DEFAULT_CLUBS) {
    await pool.query(
      `INSERT INTO clubs (code, name, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
      [club.code, club.name, club.description],
    );
  }
};

export default DEFAULT_CLUBS;
