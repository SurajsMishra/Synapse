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

    // =========================================================
    // PROJECT ID
    // =========================================================

    const numericProjectId = Number(projectId);

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

    const cursorDisposableRef = useRef(null);

    const remoteCursorHandlerRef = useRef(null);

    const remoteCursorDecorationsRef = useRef({});


    // =========================================================
    // LIFECYCLE REFS
    // =========================================================

    const applyingYjsUpdateRef = useRef(false);

    const initialSyncReceivedRef = useRef(false);

    const editorInitializedRef = useRef(false);


    // =========================================================
    // REMOTE CURSOR HANDLER
    // =========================================================

    const handleRemoteCursor = (data) => {

        if (String(data.userId) === String(user?.id)) {
            return;
        }

        if (
            Number(data?.projectId) !==
            numericProjectId
        ) {
            return;
        }

        const currentEditor =
            editorRef.current;

        if (!currentEditor) {
            return;
        }

        const model =
            currentEditor.getModel();

        if (!model) {
            return;
        }

        const remoteUserId =
            String(data?.userId);
        const username = data.username || `User ${remoteUserId}`;

        const position =
            data?.position;

        if (
            !position ||
            !position.lineNumber ||
            !position.column
        ) {
            return;
        }


        console.log(
            "REMOTE CURSOR:",
            data
        );


        // =====================================================
        // KEEP CURSOR INSIDE VALID MONACO RANGE
        // =====================================================

        const lineNumber =
            Math.max(
                1,
                Math.min(
                    position.lineNumber,
                    model.getLineCount()
                )
            );

        const column =
            Math.max(
                1,
                Math.min(
                    position.column,
                    model.getLineMaxColumn(lineNumber)
                )
            );


        // =====================================================
        // REMOVE OLD DECORATION
        // =====================================================

        const oldDecorations =
            remoteCursorDecorationsRef.current[
            remoteUserId
            ] || [];


        // =====================================================
        // CREATE NEW DECORATION
        // =====================================================

        const newDecorations =
            currentEditor.deltaDecorations(
                oldDecorations,
                [
                    {
                        range: {
                            startLineNumber:
                                lineNumber,

                            startColumn:
                                column,

                            endLineNumber:
                                lineNumber,

                            endColumn:
                                column
                        },

                        options: {

                            // IMPORTANT:
                            // zero-length Monaco ranges need
                            // beforeContentClassName for a
                            // visible cursor-like indicator.
                            beforeContentClassName:
                                `remote-cursor-${remoteUserId}`,

                            hoverMessage: {
                                value: username
                            }
                        }
                    }
                ]
            );


        remoteCursorDecorationsRef.current[
            remoteUserId
        ] = newDecorations;
    };


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
    // COLLABORATION INITIALIZATION
    // =========================================================

    useEffect(() => {

        if (!projectId) {
            return;
        }


        // =====================================================
        // VALIDATE PROJECT ID
        // =====================================================

        if (
            Number.isNaN(numericProjectId)
        ) {

            console.error(
                "Invalid project ID:",
                projectId
            );

            navigate("/");

            return;
        }


        // =====================================================
        // RESET LIFECYCLE REFS
        // =====================================================

        initialSyncReceivedRef.current =
            false;

        editorInitializedRef.current =
            false;

        applyingYjsUpdateRef.current =
            false;


        // =====================================================
        // CREATE YJS DOCUMENT
        // =====================================================

        const ydoc =
            createYDoc();

        const ytext =
            ydoc.getText("monaco");


        ydocRef.current =
            ydoc;

        ytextRef.current =
            ytext;


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

        const provider =
            new SocketProvider(
                socket,
                numericProjectId,
                ydoc
            );


        providerRef.current =
            provider;


        // IMPORTANT:
        // Connect provider before joining project.
        // =====================================================

        provider.connect();


        console.log(
            "SocketProvider connected"
        );


        // =====================================================
        // INITIALIZE MONACO FROM YJS
        // =====================================================

        const initializeEditorFromYjs = () => {

            const editor =
                editorRef.current;

            const currentYText =
                ytextRef.current;


            if (
                !editor ||
                !currentYText
            ) {
                return;
            }


            if (
                editorInitializedRef.current
            ) {
                return;
            }


            const currentText =
                currentYText.toString();


            console.log(
                "Initializing Monaco from Yjs:",
                currentText
            );


            applyingYjsUpdateRef.current =
                true;


            try {

                editor.setValue(
                    currentText
                );

                editorInitializedRef.current =
                    true;

            } finally {

                applyingYjsUpdateRef.current =
                    false;
            }
        };


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
                    projectId:
                        numericProjectId
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
            projectId: joinedProjectId
        }) => {

            console.log(
                "Successfully joined project:",
                joinedProjectId
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
                Number(data?.projectId) !==
                numericProjectId
            ) {
                return;
            }


            console.log(
                "Yjs synchronization received"
            );


            // =================================================
            // MARK INITIAL SYNC COMPLETE
            // =================================================

            initialSyncReceivedRef.current =
                true;


            // =================================================
            // INITIALIZE DEFAULT CODE IF EMPTY
            // =================================================

            if (
                ytext.length === 0
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


            // =================================================
            // INITIALIZE MONACO
            // =================================================

            initializeEditorFromYjs();
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
            setOnlineUsers(data.users);

            const onlineUserIds = new Set(
                data.users.map((onlineUser) =>
                    String(onlineUser.userId)
                )
            );

            const editor = editorRef.current;

            if (!editor) {
                return;
            }

            Object.entries(
                remoteCursorDecorationsRef.current
            ).forEach(([userId, decorationIds]) => {

                if (!onlineUserIds.has(String(userId))) {
                    editor.deltaDecorations(
                        decorationIds,
                        []
                    );

                    delete remoteCursorDecorationsRef.current[
                        userId
                    ];
                }
            });
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

        if (
            !socket.connected
        ) {

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
            // Dispose Monaco/Yjs binding
            // -------------------------------------------------

            if (
                monacoBindingRef.current
            ) {

                monacoBindingRef.current.dispose();

                monacoBindingRef.current =
                    null;
            }


            // -------------------------------------------------
            // Dispose cursor listener
            // -------------------------------------------------

            if (
                cursorDisposableRef.current
            ) {

                cursorDisposableRef.current.dispose();

                cursorDisposableRef.current =
                    null;
            }


            // -------------------------------------------------
            // Remove remote cursor listener
            // -------------------------------------------------

            if (
                remoteCursorHandlerRef.current
            ) {

                socket.off(
                    "collab:cursor",
                    remoteCursorHandlerRef.current
                );

                remoteCursorHandlerRef.current =
                    null;
            }


            // -------------------------------------------------
            // Remove remote cursor decorations
            // -------------------------------------------------

            if (
                editorRef.current
            ) {

                const allDecorations =
                    Object.values(
                        remoteCursorDecorationsRef.current
                    ).flat();


                if (
                    allDecorations.length > 0
                ) {

                    editorRef.current.deltaDecorations(
                        allDecorations,
                        []
                    );
                }
            }


            remoteCursorDecorationsRef.current =
                {};


            // -------------------------------------------------
            // Leave project
            // -------------------------------------------------

            if (
                socket.connected
            ) {

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
            // Destroy SocketProvider
            // -------------------------------------------------

            provider.destroy();

            providerRef.current =
                null;


            // -------------------------------------------------
            // Destroy Y.Doc
            // -------------------------------------------------

            ydoc.destroy();

            ydocRef.current =
                null;

            ytextRef.current =
                null;


            // -------------------------------------------------
            // Reset refs
            // -------------------------------------------------

            editorRef.current =
                null;

            initialSyncReceivedRef.current =
                false;

            editorInitializedRef.current =
                false;

            applyingYjsUpdateRef.current =
                false;


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
                    await getProject(
                        projectId
                    );


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


                setLoading(
                    false
                );
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


        // =====================================================
        // STORE EDITOR INSTANCE
        // =====================================================

        editorRef.current =
            editor;


        // =====================================================
        // GET Y.TEXT
        // =====================================================

        const ytext =
            ytextRef.current;


        if (!ytext) {

            console.error(
                "Y.Text is not available"
            );

            return;
        }


        // =====================================================
        // LOCAL CURSOR SYNCHRONIZATION
        // =====================================================

        if (
            cursorDisposableRef.current
        ) {

            cursorDisposableRef.current.dispose();

            cursorDisposableRef.current =
                null;
        }


        const cursorDisposable =
            editor.onDidChangeCursorPosition(
                (event) => {

                    const position =
                        event.position;


                    console.log(
                        "📤 Sending cursor:",
                        {
                            projectId:
                                numericProjectId,

                            position: {
                                lineNumber:
                                    position.lineNumber,

                                column:
                                    position.column
                            }
                        }
                    );


                    socket.emit(
                        "collab:cursor",
                        {
                            projectId:
                                numericProjectId,

                            position: {
                                lineNumber:
                                    position.lineNumber,

                                column:
                                    position.column
                            }
                        }
                    );
                }
            );


        cursorDisposableRef.current =
            cursorDisposable;


        // =====================================================
        // REMOTE CURSOR LISTENER
        // =====================================================

        if (
            remoteCursorHandlerRef.current
        ) {

            socket.off(
                "collab:cursor",
                remoteCursorHandlerRef.current
            );
        }


        remoteCursorHandlerRef.current =
            handleRemoteCursor;


        socket.on(
            "collab:cursor",
            handleRemoteCursor
        );


        // =====================================================
        // INITIALIZE MONACO IF SYNC ALREADY ARRIVED
        // =====================================================

        if (
            initialSyncReceivedRef.current &&
            !editorInitializedRef.current
        ) {

            const currentText =
                ytext.toString();


            console.log(
                "Initial synchronized Y.Text:",
                currentText
            );


            applyingYjsUpdateRef.current =
                true;


            try {

                editor.setValue(
                    currentText
                );


                editorInitializedRef.current =
                    true;

            } finally {

                applyingYjsUpdateRef.current =
                    false;
            }
        }


        // =====================================================
        // YJS → MONACO
        // =====================================================

        const handleYTextChange = (
            event,
            transaction
        ) => {

            const currentEditor =
                editorRef.current;


            if (!currentEditor) {
                return;
            }


            const model =
                currentEditor.getModel();


            if (!model) {
                return;
            }


            // -------------------------------------------------
            // Ignore Monaco-originated Yjs changes
            // -------------------------------------------------

            if (
                transaction.origin ===
                "monaco"
            ) {
                return;
            }


            // -------------------------------------------------
            // Wait for initial synchronization
            // -------------------------------------------------

            if (
                !initialSyncReceivedRef.current
            ) {
                return;
            }


            const edits = [];

            let index = 0;


            // -------------------------------------------------
            // Convert Yjs delta → Monaco edits
            // -------------------------------------------------

            for (
                const operation
                of event.delta
            ) {

                // ---------------------------------------------
                // RETAIN
                // ---------------------------------------------

                if (
                    operation.retain
                ) {

                    index +=
                        operation.retain;
                }


                // ---------------------------------------------
                // DELETE
                // ---------------------------------------------

                if (
                    operation.delete
                ) {

                    const startPosition =
                        model.getPositionAt(
                            index
                        );


                    const endPosition =
                        model.getPositionAt(
                            index +
                            operation.delete
                        );


                    edits.push({
                        range: {
                            startLineNumber:
                                startPosition.lineNumber,

                            startColumn:
                                startPosition.column,

                            endLineNumber:
                                endPosition.lineNumber,

                            endColumn:
                                endPosition.column
                        },

                        text: ""
                    });
                }


                // ---------------------------------------------
                // INSERT
                // ---------------------------------------------

                if (
                    operation.insert
                ) {

                    const position =
                        model.getPositionAt(
                            index
                        );


                    edits.push({
                        range: {
                            startLineNumber:
                                position.lineNumber,

                            startColumn:
                                position.column,

                            endLineNumber:
                                position.lineNumber,

                            endColumn:
                                position.column
                        },

                        text:
                            operation.insert
                    });


                    index +=
                        operation.insert.length;
                }
            }


            // -------------------------------------------------
            // Nothing to apply
            // -------------------------------------------------

            if (
                edits.length === 0
            ) {
                return;
            }


            // -------------------------------------------------
            // Apply from end → start
            // -------------------------------------------------

            edits.reverse();


            console.log(
                "Applying Yjs delta to Monaco:",
                event.delta
            );


            applyingYjsUpdateRef.current =
                true;


            try {

                currentEditor.executeEdits(
                    "yjs-remote-change",
                    edits
                );

            } finally {

                applyingYjsUpdateRef.current =
                    false;
            }
        };


        // =====================================================
        // REGISTER YJS OBSERVER
        // =====================================================

        ytext.observe(
            handleYTextChange
        );


        // =====================================================
        // MONACO → YJS
        // =====================================================

        const monacoChangeDisposable =
            editor.onDidChangeModelContent(
                (event) => {

                    // -----------------------------------------
                    // Ignore changes caused by Yjs
                    // -----------------------------------------

                    if (
                        applyingYjsUpdateRef.current
                    ) {
                        return;
                    }


                    // -----------------------------------------
                    // Wait for initial synchronization
                    // -----------------------------------------

                    if (
                        !initialSyncReceivedRef.current
                    ) {
                        return;
                    }


                    if (
                        !ytextRef.current ||
                        !ytextRef.current.doc
                    ) {
                        return;
                    }


                    console.log(
                        "Monaco changed:",
                        event.changes
                    );


                    // -----------------------------------------
                    // Process changes from end → start
                    // -----------------------------------------

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


                // ---------------------------------------------
                // Remove Yjs observer
                // ---------------------------------------------

                ytext.unobserve(
                    handleYTextChange
                );


                // ---------------------------------------------
                // Remove Monaco content listener
                // ---------------------------------------------

                monacoChangeDisposable.dispose();


                // ---------------------------------------------
                // Remove cursor listener
                // ---------------------------------------------

                if (
                    cursorDisposableRef.current
                ) {

                    cursorDisposableRef.current.dispose();

                    cursorDisposableRef.current =
                        null;
                }


                // ---------------------------------------------
                // Remove remote cursor listener
                // ---------------------------------------------

                if (
                    remoteCursorHandlerRef.current
                ) {

                    socket.off(
                        "collab:cursor",
                        remoteCursorHandlerRef.current
                    );

                    remoteCursorHandlerRef.current =
                        null;
                }


                // ---------------------------------------------
                // Remove remote cursor decorations
                // ---------------------------------------------

                if (
                    editorRef.current
                ) {

                    const allDecorations =
                        Object.values(
                            remoteCursorDecorationsRef.current
                        ).flat();


                    if (
                        allDecorations.length > 0
                    ) {

                        editorRef.current.deltaDecorations(
                            allDecorations,
                            []
                        );
                    }
                }


                remoteCursorDecorationsRef.current =
                    {};


                // ---------------------------------------------
                // Clear editor reference
                // ---------------------------------------------

                editorRef.current =
                    null;
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

