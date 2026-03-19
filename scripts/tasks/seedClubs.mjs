const clubs = [
  { code: "IUTCS", name: "Computer Society", description: "Coding contests and mentoring." },
  { code: "IUTPS", name: "Photography Society", description: "Photo walks and exhibitions." },
  { code: "IUTDS", name: "Debating Society", description: "Parliamentary and BP debating." },
];

async function ensureClubTables(pool) {
  // clubs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clubs (
      id SERIAL PRIMARY KEY,
      code VARCHAR(32) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // club members table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS club_members (
      club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      student_id VARCHAR(32) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (club_id, student_id)
    )
  `);
}

export async function seedClubs(pool) {
  await pool.query("BEGIN");

  try {
    await ensureClubTables(pool);

    for (const club of clubs) {
      await pool.query(
        `INSERT INTO clubs (code, name, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description`,
        [club.code, club.name, club.description],
      );
      console.log(` - ensured club ${club.code}`);
    }

    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

export default seedClubs;
