import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const JoinProject = () => {
    const [projectId, setProjectId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const navigate = useNavigate();

    const handleJoin = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!projectId.trim()) {
            setError("Please enter a project ID");
            return;
        }

        try {
            setLoading(true);

            const response = await api.post(
                `/projects/${projectId}/join`
            );

            setSuccess(response.data.message);

            setTimeout(() => {
                navigate("/");
            }, 800);

        } catch (error) {
            console.error("Join project error:", error);

            setError(
                error.response?.data?.message ||
                "Failed to join project"
            );

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="join-project-page">

            <div className="join-project-card">

                <h1>Join Project</h1>

                <p>
                    Enter the project ID shared by the
                    project owner.
                </p>

                <form onSubmit={handleJoin}>

                    <input
                        type="number"
                        placeholder="Project ID"
                        value={projectId}
                        onChange={(e) =>
                            setProjectId(e.target.value)
                        }
                    />

                    {error && (
                        <p className="error">
                            {error}
                        </p>
                    )}

                    {success && (
                        <p className="success">
                            {success}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Joining..."
                            : "Join Project"}
                    </button>

                </form>

                <button
                    type="button"
                    onClick={() => navigate("/")}
                >
                    Back to Dashboard
                </button>

            </div>

        </div>
    );
};

export default JoinProject;