import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { useAuth } from "../context/AuthContext";
import { getProject } from "../services/project";

function IDE() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log("IDE projectId:", projectId);

        if (!projectId || projectId === "undefined") {
            console.log("Invalid projectId");
            navigate("/");
            return;
        }

        const fetchProject = async () => {
            try {
                console.log("Fetching project:", projectId);

                const res = await getProject(projectId);

                console.log("Project response:", res.data);

                setProject(res.data.project);
            } catch (error) {
                console.error("GET PROJECT ERROR:", error);
                console.error("Response:", error.response?.data);

                navigate("/");
            } finally {
                console.log("Finished loading project");
                setLoading(false);
            }
        };

        fetchProject();
    }, [projectId, navigate]);
    if (loading) {
        return <h1>Loading workspace...</h1>;
    }

    if (!project) {
        return null;
    }

    return (
        <div className="ide">
            <header className="navbar">
                <h2>{project.name}</h2>

                <div>
                    <button onClick={() => navigate("/")}>← Dashboard</button>
                    <span>{user?.username}</span>
                    <button onClick={logout}>Logout</button>
                </div>
            </header>

            <div className="ide-main">
                <aside className="explorer">
                    <h3>EXPLORER</h3>
                    <div>📁 src</div>
                    <div className="file">📄 App.jsx</div>
                    <div className="file">📄 main.jsx</div>
                </aside>

                <main className="editor">
                    <Editor
                        height="100%"
                        defaultLanguage="javascript"
                        defaultValue={`function App() {
    return (
        <div>
            <h1>Hello Collaborative IDE</h1>
        </div>
    );
}

export default App;`}
                        theme="vs-dark"
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                        }}
                    />
                </main>

                <aside className="ai-panel">
                    <h3>AI ASSISTANT</h3>
                    <p>Ask questions about your code.</p>
                    <input type="text" placeholder="Ask AI..." />
                    <button>Ask</button>
                </aside>
            </div>

            <footer className="terminal">
                <div>TERMINAL</div>
                <p>$ Ready...</p>
            </footer>
        </div>
    );
}

export default IDE;