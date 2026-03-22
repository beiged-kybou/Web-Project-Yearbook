import { isRootAdmin } from "../config/rootAdmins.js";

const normalizeEmail = (value = "") => value.trim().toLowerCase();

export const getAccessList = async (req, res) => {
  const pool = await req.app.locals.getPool();

  try {
    const result = await pool.query(
      `SELECT id, email, display_name, role, created_at
       FROM users
       ORDER BY role = 'admin' DESC, created_at ASC`,
    );

    res.status(200).json({
      admins: result.rows.filter((user) => user.role === "admin"),
      users: result.rows,
    });
  } catch (error) {
    console.error("Get access list error", error);
    res.status(500).json({ error: "Failed to load access list" });
  }
};

export const updateRole = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { userId } = req.params;
  const { role } = req.body;

  if (!role || !["student", "teacher", "staff", "admin"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  try {
    const userResult = await pool.query(
      "SELECT email FROM users WHERE id = $1",
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const targetEmail = normalizeEmail(userResult.rows[0].email);
    const isTargetRootAdmin = isRootAdmin(targetEmail);
    const isRequesterRootAdmin = isRootAdmin(req.user?.email);

    if (isTargetRootAdmin && !isRequesterRootAdmin) {
      return res.status(403).json({ error: "Only a root admin can modify another root admin" });
    }

    if (!isTargetRootAdmin && role === "admin" && !isRequesterRootAdmin) {
      const existingAdmins = await pool.query(
        "SELECT COUNT(*) FROM users WHERE role = 'admin'",
      );
      if (Number(existingAdmins.rows[0].count || 0) >= 5) {
        return res.status(403).json({ error: "Admin limit reached. Ask a root admin to promote more members." });
      }
    }

    const updateResult = await pool.query(
      `UPDATE users
       SET role = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, display_name, role`,
      [role, userId],
    );

    res.status(200).json({ message: "Role updated", user: updateResult.rows[0] });
  } catch (error) {
    console.error("Update role error", error);
    res.status(500).json({ error: "Failed to update role" });
  }
};

export const revokeAccess = async (req, res) => {
  const pool = await req.app.locals.getPool();
  const { userId } = req.params;

  try {
    const userResult = await pool.query(
      "SELECT email FROM users WHERE id = $1",
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const targetEmail = normalizeEmail(userResult.rows[0].email);
    const isTargetRootAdmin = isRootAdmin(targetEmail);
    const isRequesterRootAdmin = isRootAdmin(req.user?.email);

    if (isTargetRootAdmin && !isRequesterRootAdmin) {
      return res.status(403).json({ error: "Only a root admin can remove another root admin" });
    }

    const deleteResult = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id, email",
      [userId],
    );

    res.status(200).json({ message: "Access revoked", removed: deleteResult.rows[0] });
  } catch (error) {
    console.error("Revoke access error", error);
    res.status(500).json({ error: "Failed to revoke access" });
  }
};
