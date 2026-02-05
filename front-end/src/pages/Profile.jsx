import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileInfo from "../components/profile/ProfileInfo";
import ProfileEditForm from "../components/profile/ProfileEditForm";
import styles from "../components/profile/Profile.module.css";
import api from "../services/api";

const Profile = () => {
    const { user, setUser } = useAuth(); // Assuming AuthContext exposes setUser or we refetch
    const [isEditing, setIsEditing] = useState(false);
    const [profileData, setProfileData] = useState(user);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real app, we might fetch the profile by ID from URL params if looking at others
        // For now, we look at own profile
        if (user) {
            // Simulate fetching latest data
            setProfileData(user);
            setLoading(false);
        }
    }, [user]);

    const handleSave = async (updatedData) => {
        try {
            const response = await api.put(`/students/${user.student_id}`, updatedData);
            setProfileData(response.data);
            setIsEditing(false);
            // Update global user context if needed, usually re-fetching 'me' is better
        } catch (error) {
            console.error("Update failed", error);
            throw error; // Let form handle it
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!profileData) return <div>Profile not found</div>;

    return (
        <div className={styles.profilePage}>
            <ProfileHeader
                user={profileData}
                isOwnProfile={true} /* Logic for checking ownership */
                onEdit={() => setIsEditing(true)}
            />

            {isEditing ? (
                <ProfileEditForm
                    user={profileData}
                    onCancel={() => setIsEditing(false)}
                    onSave={handleSave}
                />
            ) : (
                <ProfileInfo user={profileData} />
            )}
        </div>
    );
};

export default Profile;
