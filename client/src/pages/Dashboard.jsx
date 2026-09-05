import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProjects } from "../services/project";
import { useAuth } from "../context/AuthContext";

function Dashboard() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await getProjects();

            console.log("Projects:", res.data);

            setProjects(res.data.projects || []);
        } catch (error) {
            console.error("Failed to fetch projects:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard">

            <header className="navbar">
                <h2>Collaborative IDE</h2>

                <div>
                    <span>
                        Welcome, {user?.username || "User"}
                    </span>

                    <button onClick={logout}>
                        Logout
                    </button>
                </div>
            </header>

            <main className="dashboard-content">

                <div className="dashboard-header">
                    <div>
                        <h1>My Projects</h1>
                        <p>
                            Create and collaborate on your coding projects.
                        </p>
                    </div>

                    <button
                        onClick={() => navigate("/projects/new")}
                    >
                        + New Project
                    </button>
                    <button onClick={() => navigate("/projects/join")}>
                        Join Project
                    </button>
                </div>

                {loading ? (
                    <p>Loading projects...</p>
                ) : projects.length === 0 ? (
                    <div className="empty-projects">
                        <h2>No projects yet</h2>

                        <p>
                            Create your first project to start coding.
                        </p>

                        <button
                            onClick={() => navigate("/projects/new")}
                        >
                            Create Project
                        </button>

                    </div>
                ) : (
                    <div className="projects-grid">

                        {projects.map((project) => (
                            <div
                                key={project.id}
                                className="project-card"
                                onClick={() =>
                                    navigate(`/ide/${project.id}`)
                                }
                            >
                                <h3>{project.name}</h3>

                                <p>
                                    {project.description ||
                                        "No description"}
                                </p>

                                <small>
                                    Open IDE →
                                </small>
                            </div>
                        ))}

                    </div>
                )}

            </main>
        </div>
    );
}

export default Dashboard;