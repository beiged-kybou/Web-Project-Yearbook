const orderedTables = [
  "tag_notifications",
  "memory_participants",
  "images",
  "memories",
  "albums",
  "club_members",
  "users",
  "students",
  "otp_verifications",
];

async function tableExists(pool, tableName) {
  const { rows } = await pool.query("SELECT to_regclass($1) AS oid", [
    `public.${tableName}`,
  ]);
  return Boolean(rows[0]?.oid);
}

export async function wipeUsers(pool) {
  await pool.query("BEGIN");

  try {
    const stats = [];
    for (const table of orderedTables) {
      const exists = await tableExists(pool, table);
      if (!exists) {
        stats.push({ table, skipped: true });
        continue;
      }

      const result = await pool.query(`DELETE FROM ${table}`);
      stats.push({ table, count: result.rowCount });
    }

    await pool.query("COMMIT");

    for (const entry of stats) {
      if (entry.skipped) {
        console.log(` - ${entry.table}: skipped (table not found)`);
      } else {
        console.log(` - ${entry.table}: ${entry.count} rows removed`);
      }
    }
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

export default wipeUsers;
