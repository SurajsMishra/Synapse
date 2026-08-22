import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject } from "../services/project";

function CreateProject() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await createProject({ name, description });
            navigate(`/ide/${res.data.project.id}`);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create project");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <form className="auth-card" onSubmit={handleSubmit}>
                <h1>New Project</h1>
                <input
                    placeholder="Project name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <input
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
                {error && <p className="auth-error">{error}</p>}
                <button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create Project"}
                </button>
                <button type="button" onClick={() => navigate("/")}>Cancel</button>
            </form>
        </div>
    );
}

export default CreateProject;