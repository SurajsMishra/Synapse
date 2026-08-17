import Editor from "@monaco-editor/react";

function IDE() {
    return (
        <div className="ide">
            
            {/* Navbar */}
            <header className="navbar">
                <h2>Collaborative AI IDE</h2>
            </header>

            {/* Main IDE */}
            <div className="ide-main">

                {/* File Explorer */}
                <aside className="explorer">
                    <h3>EXPLORER</h3>

                    <div>📁 src</div>
                    <div className="file">📄 App.jsx</div>
                    <div className="file">📄 main.jsx</div>
                </aside>


                {/* Editor */}
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
                            minimap: {
                                enabled: false
                            },
                            fontSize: 14
                        }}
                    />
                </main>


                {/* AI Panel */}
                <aside className="ai-panel">
                    <h3>AI ASSISTANT</h3>

                    <p>
                        Ask questions about your code.
                    </p>

                    <input
                        type="text"
                        placeholder="Ask AI..."
                    />

                    <button>
                        Ask
                    </button>
                </aside>

            </div>

            {/* Terminal */}
            <footer className="terminal">
                <div>TERMINAL</div>
                <p>$ Ready...</p>
            </footer>

        </div>
    );
}

export default IDE;