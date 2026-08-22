import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject } from "../services/project";

function NewProject() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name.trim()) {
            setError("Project name is required");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const res = await createProject({
                name: name.trim(),
                description: description.trim(),
            });

            console.log("Project created:", res.data);

            // Go back to Dashboard
            navigate("/");
        } catch (error) {
            console.error("Create project error:", error);

            setError(
                error.response?.data?.message ||
                "Failed to create project"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="new-project-page">

            <div className="new-project-container">

                <button
                    className="back-button"
                    onClick={() => navigate("/")}
                >
                    ← Back to Dashboard
                </button>

                <h1>Create New Project</h1>

                <p>
                    Create a project and start building with your team.
                </p>

                <form onSubmit={handleSubmit}>

                    <div className="form-group">
                        <label htmlFor="name">
                            Project Name
                        </label>

                        <input
                            id="name"
                            type="text"
                            placeholder="My Collaborative Project"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">
                            Description
                        </label>

                        <textarea
                            id="description"
                            placeholder="Describe your project..."
                            value={description}
                            onChange={(e) =>
                                setDescription(e.target.value)
                            }
                            rows={5}
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <p className="error">
                            {error}
                        </p>
                    )}

                    <div className="form-actions">

                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            disabled={loading}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                        >
                            {loading
                                ? "Creating..."
                                : "Create Project"}
                        </button>

                    </div>

                </form>

            </div>

        </div>
    );
}

export default NewProject;