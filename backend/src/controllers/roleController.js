import { isRootAdmin } from "../config/rootAdmins.js";
import User from "../models/User.js";

const normalizeEmail = (value = "") => value.trim().toLowerCase();

export const getAccessList = async (req, res) => {
  try {
    const result = await User.find({})
      .select('email displayName role created_at')
      .sort({ created_at: 1 });

    // Assuming we want admins first according to order by role = 'admin' DESC
    // We can sort them in JS if needed.
    const admins = result.filter(user => user.role === 'admin');
    const users = result;

    res.status(200).json({ admins, users });
  } catch (error) {
    console.error("Get access list error", error);
    res.status(500).json({ error: "Failed to load access list" });
  }
};

export const updateRole = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!role || !["student", "teacher", "staff", "admin"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const targetEmail = normalizeEmail(user.email);
    const isTargetRootAdmin = isRootAdmin(targetEmail);
    const isRequesterRootAdmin = isRootAdmin(req.user?.email);

    if (isTargetRootAdmin && !isRequesterRootAdmin) {
      return res.status(403).json({ error: "Only a root admin can modify another root admin" });
    }

    if (!isTargetRootAdmin && role === "admin" && !isRequesterRootAdmin) {
      const existingAdmins = await User.countDocuments({ role: 'admin' });
      if (existingAdmins >= 5) {
        return res.status(403).json({ error: "Admin limit reached. Ask a root admin to promote more members." });
      }
    }

    user.role = role;
    await user.save();

    res.status(200).json({ message: "Role updated", user: { id: user._id, email: user.email, display_name: user.displayName, role: user.role } });
  } catch (error) {
    console.error("Update role error", error);
    res.status(500).json({ error: "Failed to update role" });
  }
};

export const revokeAccess = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const targetEmail = normalizeEmail(user.email);
    const isTargetRootAdmin = isRootAdmin(targetEmail);
    const isRequesterRootAdmin = isRootAdmin(req.user?.email);

    if (isTargetRootAdmin && !isRequesterRootAdmin) {
      return res.status(403).json({ error: "Only a root admin can remove another root admin" });
    }

    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "Access revoked", removed: { id: user._id, email: user.email } });
  } catch (error) {
    console.error("Revoke access error", error);
    res.status(500).json({ error: "Failed to revoke access" });
  }
};
