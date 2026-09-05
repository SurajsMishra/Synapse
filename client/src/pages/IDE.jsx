import {
    useEffect,
    useRef,
    useState
} from "react";

import {
    useParams,
    useNavigate
} from "react-router-dom";

import Editor from "@monaco-editor/react";

import { useAuth } from "../context/AuthContext";
import { getProject } from "../services/project";
import socket from "../socket/socket";

import { createYDoc } from "../collaboration/ydoc";
import { SocketProvider } from "../collaboration/socketProvider";


function IDE() {

    const { projectId } = useParams();
    const navigate = useNavigate();

    const { user, logout } = useAuth();

    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState([]);


    // =========================================================
    // COLLABORATION REFS
    // =========================================================

    const ydocRef = useRef(null);
    const ytextRef = useRef(null);
    const providerRef = useRef(null);

    const editorRef = useRef(null);
    const monacoBindingRef = useRef(null);

    // Prevent Monaco <-> Yjs infinite loop
    const applyingYjsUpdateRef = useRef(false);


    // =========================================================
    // DEFAULT CODE
    // =========================================================

    const defaultCode = `function App() {
    return (
        <div>
            <h1>Hello Collaborative IDE</h1>
        </div>
    );
}

export default App;`;


    // =========================================================
    // SOCKET + YJS COLLABORATION
    // =========================================================

    useEffect(() => {

        if (!projectId) {
            return;
        }

        const numericProjectId = Number(projectId);

        if (Number.isNaN(numericProjectId)) {

            console.error(
                "Invalid project ID:",
                projectId
            );

            navigate("/");
            return;
        }


        // =====================================================
        // CREATE YJS DOCUMENT
        // =====================================================

        const ydoc = createYDoc();

        const ytext =
            ydoc.getText("monaco");


        ydocRef.current = ydoc;
        ytextRef.current = ytext;


        console.log(
            "Yjs document created:",
            ydoc
        );

        console.log(
            "Y.Text created:",
            ytext
        );


        // =====================================================
        // CREATE SOCKET PROVIDER
        // =====================================================

        const provider = new SocketProvider(
            socket,
            numericProjectId,
            ydoc
        );

        providerRef.current = provider;


        // IMPORTANT:
        // Register Yjs listeners before joining project
        provider.connect();


        console.log(
            "SocketProvider connected"
        );


        // =====================================================
        // SOCKET CONNECTED
        // =====================================================

        const handleConnect = () => {

            console.log(
                "Socket connected:",
                socket.id
            );

            console.log(
                "Joining project:",
                numericProjectId
            );

            socket.emit(
                "project:join",
                {
                    projectId: numericProjectId
                }
            );
        };


        // =====================================================
        // SOCKET DISCONNECTED
        // =====================================================

        const handleDisconnect = (reason) => {

            console.log(
                "Socket disconnected:",
                reason
            );
        };


        // =====================================================
        // PROJECT JOINED
        // =====================================================

        const handleProjectJoined = ({
            projectId
        }) => {

            console.log(
                "Successfully joined project:",
                projectId
            );

            console.log(
                "Requesting Yjs synchronization..."
            );

            provider.requestSync();
        };


        // =====================================================
        // YJS SYNC RECEIVED
        // =====================================================

        const handleCollabSync = (data) => {

            if (
                Number(data.projectId) !==
                numericProjectId
            ) {
                return;
            }

            console.log(
                "Yjs synchronization received"
            );

            /*
             * SocketProvider is responsible for
             * applying the actual Yjs update.
             *
             * We only use this event to initialize
             * an empty document.
             */

            if (
                ytext.length === 0 &&
                editorRef.current
            ) {

                console.log(
                    "Yjs document is empty."
                );

                console.log(
                    "Initializing default code..."
                );

                ytext.insert(
                    0,
                    defaultCode
                );
            }
        };


        // =====================================================
        // PROJECT ERROR
        // =====================================================

        const handleProjectError = ({
            message
        }) => {

            console.error(
                "Project error:",
                message
            );
        };


        // =====================================================
        // PRESENCE UPDATE
        // =====================================================

        const handlePresenceUpdate = (data) => {

            console.log(
                "PRESENCE UPDATE:",
                data
            );

            setOnlineUsers(
                data.users || []
            );
        };


        // =====================================================
        // YJS DEBUG
        // =====================================================

        const handleYjsUpdate = (
            update,
            origin
        ) => {

            console.log(
                "YJS UPDATE:",
                update,
                "origin:",
                origin
            );
        };


        // =====================================================
        // REGISTER SOCKET LISTENERS
        // =====================================================

        socket.on(
            "connect",
            handleConnect
        );

        socket.on(
            "disconnect",
            handleDisconnect
        );

        socket.on(
            "project:joined",
            handleProjectJoined
        );

        socket.on(
            "collab:sync",
            handleCollabSync
        );

        socket.on(
            "project:error",
            handleProjectError
        );

        socket.on(
            "presence:update",
            handlePresenceUpdate
        );


        // =====================================================
        // YJS DEBUG LISTENER
        // =====================================================

        ydoc.on(
            "update",
            handleYjsUpdate
        );


        // =====================================================
        // CONNECT SOCKET
        // =====================================================

        if (!socket.connected) {

            console.log(
                "Connecting socket..."
            );

            socket.connect();

        } else {

            console.log(
                "Socket already connected:",
                socket.id
            );

            socket.emit(
                "project:join",
                {
                    projectId:
                        numericProjectId
                }
            );
        }


        // =====================================================
        // CLEANUP
        // =====================================================

        return () => {

            console.log(
                "Cleaning up IDE collaboration..."
            );


            // -------------------------------------------------
            // Remove Monaco/Yjs binding
            // -------------------------------------------------

            if (
                monacoBindingRef.current
            ) {

                monacoBindingRef.current.dispose();

                monacoBindingRef.current = null;
            }


            // -------------------------------------------------
            // Leave project
            // -------------------------------------------------

            if (socket.connected) {

                socket.emit(
                    "project:leave",
                    {
                        projectId:
                            numericProjectId
                    }
                );
            }


            // -------------------------------------------------
            // Remove socket listeners
            // -------------------------------------------------

            socket.off(
                "connect",
                handleConnect
            );

            socket.off(
                "disconnect",
                handleDisconnect
            );

            socket.off(
                "project:joined",
                handleProjectJoined
            );

            socket.off(
                "collab:sync",
                handleCollabSync
            );

            socket.off(
                "project:error",
                handleProjectError
            );

            socket.off(
                "presence:update",
                handlePresenceUpdate
            );


            // -------------------------------------------------
            // Remove Yjs debug listener
            // -------------------------------------------------

            ydoc.off(
                "update",
                handleYjsUpdate
            );


            // -------------------------------------------------
            // Destroy provider
            // -------------------------------------------------

            provider.destroy();

            providerRef.current = null;


            // -------------------------------------------------
            // Destroy Y.Doc
            // -------------------------------------------------

            ydoc.destroy();

            ydocRef.current = null;
            ytextRef.current = null;


            // -------------------------------------------------
            // Disconnect socket
            // -------------------------------------------------

            socket.disconnect();
        };

    }, [projectId, navigate]);


    // =========================================================
    // FETCH PROJECT
    // =========================================================

    useEffect(() => {

        console.log(
            "IDE projectId:",
            projectId
        );


        if (
            !projectId ||
            projectId === "undefined"
        ) {

            console.log(
                "Invalid projectId"
            );

            navigate("/");
            return;
        }


        const fetchProject = async () => {

            try {

                console.log(
                    "Fetching project:",
                    projectId
                );

                const res =
                    await getProject(projectId);


                console.log(
                    "Project response:",
                    res.data
                );


                setProject(
                    res.data.project
                );

            } catch (error) {

                console.error(
                    "GET PROJECT ERROR:",
                    error
                );

                console.error(
                    "Response:",
                    error.response?.data
                );

                navigate("/");

            } finally {

                console.log(
                    "Finished loading project"
                );

                setLoading(false);
            }
        };


        fetchProject();

    }, [projectId, navigate]);


    // =========================================================
    // MONACO EDITOR MOUNT
    // =========================================================

    const handleEditorMount = (
        editor
    ) => {

        console.log(
            "Monaco editor mounted"
        );


        editorRef.current = editor;


        const ytext =
            ytextRef.current;


        if (!ytext) {

            console.error(
                "Y.Text is not available"
            );

            return;
        }


        // =====================================================
        // INITIALIZE DOCUMENT
        // =====================================================

        if (ytext.length === 0) {

            console.log(
                "Y.Text empty. Initializing default code..."
            );

            ytext.insert(
                0,
                defaultCode
            );
        }


        // =====================================================
        // SET INITIAL MONACO VALUE
        // =====================================================

        const currentText =
            ytext.toString();


        console.log(
            "Initial Y.Text:",
            currentText
        );


        applyingYjsUpdateRef.current = true;

        editor.setValue(
            currentText
        );

        applyingYjsUpdateRef.current = false;


        // =====================================================
        // YJS → MONACO
        // =====================================================

        const handleYTextChange = () => {

            if (
                !editorRef.current
            ) {
                return;
            }


            const currentEditor =
                editorRef.current;

            const model =
                currentEditor.getModel();


            if (!model) {
                return;
            }


            const newValue =
                ytext.toString();


            console.log(
                "Y.Text changed:",
                newValue
            );


            /*
             * IMPORTANT
             *
             * editor.setValue() resets the cursor
             * to the beginning of the document.
             *
             * We save the cursor offset first
             * and restore it afterwards.
             */

            const currentPosition =
                currentEditor.getPosition();


            let currentOffset = 0;


            if (currentPosition) {

                currentOffset =
                    model.getOffsetAt(
                        currentPosition
                    );
            }


            applyingYjsUpdateRef.current =
                true;


            try {

                currentEditor.setValue(
                    newValue
                );


                const newModel =
                    currentEditor.getModel();


                if (!newModel) {
                    return;
                }


                /*
                 * Make sure the cursor doesn't
                 * exceed the new document length.
                 */

                const safeOffset =
                    Math.min(
                        currentOffset,
                        newModel.getValueLength()
                    );


                const newPosition =
                    newModel.getPositionAt(
                        safeOffset
                    );


                currentEditor.setPosition(
                    newPosition
                );

            } finally {

                applyingYjsUpdateRef.current =
                    false;
            }
        };


        ytext.observe(
            handleYTextChange
        );


        // =====================================================
        // MONACO → YJS
        // =====================================================

        const monacoChangeDisposable =
            editor.onDidChangeModelContent(
                (event) => {

                    /*
                     * Ignore changes that were caused
                     * by Yjs.
                     */

                    if (
                        applyingYjsUpdateRef.current
                    ) {
                        return;
                    }


                    console.log(
                        "Monaco changed:",
                        event.changes
                    );


                    /*
                     * Monaco may provide multiple
                     * changes in one event.
                     *
                     * Apply changes from the end
                     * toward the beginning.
                     */

                    const changes =
                        [...event.changes].sort(
                            (a, b) =>
                                b.rangeOffset -
                                a.rangeOffset
                        );


                    ytext.doc.transact(
                        () => {

                            for (
                                const change
                                of changes
                            ) {

                                // -----------------------------
                                // DELETE
                                // -----------------------------

                                if (
                                    change.rangeLength >
                                    0
                                ) {

                                    ytext.delete(
                                        change.rangeOffset,
                                        change.rangeLength
                                    );
                                }


                                // -----------------------------
                                // INSERT
                                // -----------------------------

                                if (
                                    change.text.length >
                                    0
                                ) {

                                    ytext.insert(
                                        change.rangeOffset,
                                        change.text
                                    );
                                }
                            }

                        },
                        "monaco"
                    );
                }
            );


        // =====================================================
        // STORE BINDING
        // =====================================================

        monacoBindingRef.current = {

            dispose: () => {

                console.log(
                    "Disposing Monaco ↔ Y.Text binding"
                );


                ytext.unobserve(
                    handleYTextChange
                );


                monacoChangeDisposable.dispose();


                editorRef.current = null;
            }

        };


        console.log(
            "Monaco ↔ Y.Text binding established"
        );
    };


    // =========================================================
    // LOADING STATE
    // =========================================================

    if (loading) {

        return (
            <h1>
                Loading workspace...
            </h1>
        );
    }


    // =========================================================
    // PROJECT NOT FOUND
    // =========================================================

    if (!project) {
        return null;
    }


    // =========================================================
    // IDE UI
    // =========================================================

    return (

        <div className="ide">


            {/* =================================================
                NAVBAR
            ================================================= */}

            <header className="navbar">

                <h2>
                    {project.name}
                </h2>


                <div className="navbar-right">


                    {/* =========================================
                        ONLINE USERS
                    ========================================= */}

                    <div className="online-users">

                        <span className="online-label">

                            🟢{" "}
                            {onlineUsers.length}
                            {" "}
                            online

                        </span>


                        <div className="user-list">

                            {onlineUsers.map(
                                (onlineUser) => (

                                    <div
                                        key={
                                            onlineUser.userId
                                        }
                                        className="online-user"
                                    >

                                        <div className="user-avatar">

                                            {
                                                onlineUser.userId
                                            }

                                        </div>


                                        <span>

                                            User{" "}
                                            {
                                                onlineUser.userId
                                            }

                                        </span>

                                    </div>

                                )
                            )}

                        </div>

                    </div>


                    {/* =========================================
                        CURRENT USER
                    ========================================= */}

                    <span>

                        {user?.username}

                    </span>


                    {/* =========================================
                        DASHBOARD
                    ========================================= */}

                    <button
                        onClick={() =>
                            navigate("/")
                        }
                    >

                        ← Dashboard

                    </button>


                    {/* =========================================
                        LOGOUT
                    ========================================= */}

                    <button
                        onClick={logout}
                    >

                        Logout

                    </button>

                </div>

            </header>


            {/* =================================================
                MAIN IDE
            ================================================= */}

            <div className="ide-main">


                {/* =============================================
                    FILE EXPLORER
                ============================================= */}

                <aside className="explorer">

                    <h3>
                        EXPLORER
                    </h3>


                    <div>
                        📁 src
                    </div>


                    <div className="file">
                        📄 App.jsx
                    </div>


                    <div className="file">
                        📄 main.jsx
                    </div>

                </aside>


                {/* =============================================
                    MONACO EDITOR
                ============================================= */}

                <main className="editor">

                    <Editor
                        height="100%"
                        defaultLanguage="javascript"
                        onMount={
                            handleEditorMount
                        }
                        theme="vs-dark"
                        options={{
                            minimap: {
                                enabled: false
                            },

                            fontSize: 14
                        }}
                    />

                </main>


                {/* =============================================
                    AI PANEL
                ============================================= */}

                <aside className="ai-panel">

                    <h3>
                        AI ASSISTANT
                    </h3>


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


            {/* =================================================
                TERMINAL
            ================================================= */}

            <footer className="terminal">

                <div>
                    TERMINAL
                </div>


                <p>
                    $ Ready...
                </p>

            </footer>

        </div>
    );
}


export default IDE;