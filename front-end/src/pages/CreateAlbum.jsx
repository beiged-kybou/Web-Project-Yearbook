import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import MemberSelector from "../components/albums/MemberSelector";
// import api from "../services/api";

const CreateAlbum = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: "",
        type: "personal", // personal, group, batch, common
        description: "",
        members: [],
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleMemberChange = (members) => {
        setFormData({ ...formData, members });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // await api.post("/albums", formData);
            // Simulate success
            console.log("Creating album", formData);
            navigate("/albums");
        } catch (error) {
            console.error("Failed to create album", error);
            alert("Failed to create album");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: "600px" }}>
            <h1>Create New Album</h1>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.5rem" }}>

                <Input
                    label="Album Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                />

                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>Album Type</label>
                    <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        style={{
                            padding: "0.5rem",
                            borderRadius: "0.5rem",
                            border: "1px solid var(--color-border)",
                            backgroundColor: "var(--color-surface)",
                            color: "var(--color-text-main)"
                        }}
                    >
                        <option value="personal">Personal Album</option>
                        <option value="group">Group Album</option>
                        <option value="batch">Batch Album (Class)</option>
                        <option value="common">Common (Public Event)</option>
                    </select>
                </div>

                {formData.type === "group" && (
                    <MemberSelector
                        selectedMembers={formData.members}
                        onMemberChange={handleMemberChange}
                    />
                )}

                {formData.type === "batch" && (
                    <p className="text-muted" style={{ fontSize: "0.875rem" }}>
                        Batch albums are visible to everyone in your graduation year.
                    </p>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        style={{
                            padding: "0.5rem",
                            borderRadius: "0.5rem",
                            border: "1px solid var(--color-border)",
                            fontFamily: "inherit"
                        }}
                    />
                </div>

                <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                    <Button type="button" variant="secondary" onClick={() => navigate("/albums")}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={loading}>
                        Create Album
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default CreateAlbum;
