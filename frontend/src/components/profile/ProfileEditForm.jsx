import { useState } from "react";
import Button from "../common/Button";
import Input from "../common/Input";
import styles from "./Profile.module.css";
// import api from "../../services/api";

const ProfileEditForm = ({ user, onCancel, onSave }) => {
    const [formData, setFormData] = useState({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone: user.phone || "",
        bio: user.bio || "",
        motto: user.motto || "",
        department: user.department || "",
        graduation_year: user.graduation_year || "",
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Call API to update profile
            // await api.put(`/students/${user.student_id}`, formData);
            // For now, assume success and call onSave
            await onSave(formData);
        } catch (error) {
            console.error("Failed to update profile", error);
            alert("Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.infoSection}>
            <div className={styles.mainInfo}>
                <h2>Edit Profile</h2>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <Input
                        label="First Name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        label="Last Name"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        required
                    />
                </div>

                <Input
                    label="Motto"
                    name="motto"
                    value={formData.motto}
                    onChange={handleChange}
                    placeholder="Your favorite quote"
                />

                <div style={{ marginTop: "1rem" }}>
                    <label className={styles.detailLabel}>Bio</label>
                    <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        className={styles.bioInput} /* We need to add this style */
                        rows={5}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", marginTop: "0.25rem", fontFamily: "inherit" }}
                    />
                </div>

                <div className={styles.editActions}>
                    <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={loading}>
                        Save Changes
                    </Button>
                </div>
            </div>

            <div className={styles.detailsCard}>
                <h3>Academic Info (Read Only)</h3>
                <p className={styles.detailLabel}>Department: {user.department}</p>
                <p className={styles.detailLabel}>Graduation Year: {user.graduation_year}</p>
                <p className={styles.detailLabel} style={{ marginTop: '1rem' }}>Contact Info</p>
                <Input
                    label="Phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                />
            </div>
        </form>
    );
};

export default ProfileEditForm;
