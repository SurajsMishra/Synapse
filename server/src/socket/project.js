const prisma = require("../lib/prisma");
const Y = require("yjs");

const {
    projectUsers,
    getOnlineUsers
} = require("./presence");

const projectDocs = new Map();

const getProjectDoc = (projectId) => {
    if (!projectDocs.has(projectId)) {
        projectDocs.set(
            projectId,
            new Y.Doc()
        );
    }

    return projectDocs.get(projectId);
};

const projectSocketHandler = (io, socket) => {

    // Store projects joined by this socket
    socket.joinedProjects = new Set();


    // ============================================
    // JOIN PROJECT
    // ============================================

    socket.on("project:join", async ({ projectId }) => {

        try {

            // -----------------------------
            // Validate project ID
            // -----------------------------

            if (!projectId) {

                socket.emit("project:error", {
                    message: "Project ID is required"
                });

                return;
            }

            // -----------------------------
            // Validate authentication
            // -----------------------------

            if (!socket.userId) {

                socket.emit("project:error", {
                    message: "Authentication required"
                });

                return;
            }

            const numericProjectId = Number(projectId);
            const numericUserId = Number(socket.userId);

            if (Number.isNaN(numericProjectId)) {

                socket.emit("project:error", {
                    message: "Invalid project ID"
                });

                return;
            }

            // -----------------------------
            // Find project
            // -----------------------------

            const project =
                await prisma.project.findUnique({
                    where: {
                        id: numericProjectId
                    }
                });

            if (!project) {

                socket.emit("project:error", {
                    message: "Project not found"
                });

                return;
            }

            // -----------------------------
            // Check owner
            // -----------------------------

            const isOwner =
                project.ownerId === numericUserId;

            // -----------------------------
            // Check membership
            // -----------------------------

            const membership =
                await prisma.projectMember.findUnique({
                    where: {
                        userId_projectId: {
                            userId: numericUserId,
                            projectId: numericProjectId
                        }
                    }
                });

            const isMember = !!membership;

            // -----------------------------
            // Authorization
            // -----------------------------

            if (!isOwner && !isMember) {

                socket.emit("project:error", {
                    message:
                        "You are not authorized to access this project"
                });

                return;
            }

            // ============================================
            // USER AUTHORIZED
            // ============================================

            const room =
                `project:${numericProjectId}`;

            // -----------------------------
            // Prevent duplicate join
            // -----------------------------

            if (socket.joinedProjects.has(numericProjectId)) {

                console.log(
                    `Socket ${socket.id} already joined ${room}`
                );

                return;
            }

            // -----------------------------
            // Join Socket.io room
            // -----------------------------

            socket.join(room);

            socket.joinedProjects.add(
                numericProjectId
            );

            console.log(
                "JOIN:",
                socket.id,
                "user:",
                numericUserId,
                "project:",
                numericProjectId
            );

            // -----------------------------
            // Create presence map
            // -----------------------------

            if (!projectUsers.has(numericProjectId)) {

                projectUsers.set(
                    numericProjectId,
                    new Map()
                );
            }

            // -----------------------------
            // Add socket to presence
            // -----------------------------

            projectUsers
                .get(numericProjectId)
                .set(
                    socket.id,
                    numericUserId
                );

            // -----------------------------
            // Get online users
            // -----------------------------

            const users =
                getOnlineUsers(numericProjectId);

            // -----------------------------
            // Notify everyone
            // -----------------------------

            io.to(room).emit(
                "presence:update",
                {
                    projectId: numericProjectId,
                    users
                }
            );

            // -----------------------------
            // Confirm join
            // -----------------------------

            socket.emit(
                "project:joined",
                {
                    projectId: numericProjectId
                }
            );

        } catch (error) {

            console.error(
                "Project join error:",
                error
            );

            socket.emit(
                "project:error",
                {
                    message: "Unable to join project"
                }
            );
        }
    });


    // ============================================
    // LEAVE PROJECT
    // ============================================

    socket.on("project:leave", ({ projectId }) => {

        try {

            if (!projectId) {
                return;
            }

            const numericProjectId =
                Number(projectId);

            const room =
                `project:${numericProjectId}`;

            // -----------------------------
            // Leave room
            // -----------------------------

            socket.leave(room);

            socket.joinedProjects.delete(
                numericProjectId
            );

            console.log(
                "LEAVE:",
                socket.id,
                "project:",
                numericProjectId
            );

            // -----------------------------
            // Remove from presence
            // -----------------------------

            const users =
                projectUsers.get(numericProjectId);

            if (!users) {
                return;
            }

            users.delete(socket.id);

            // -----------------------------
            // No users remaining
            // -----------------------------

            if (users.size === 0) {

                projectUsers.delete(
                    numericProjectId
                );

                return;
            }

            // -----------------------------
            // Send updated presence
            // -----------------------------

            const onlineUsers =
                getOnlineUsers(numericProjectId);

            io.to(room).emit(
                "presence:update",
                {
                    projectId: numericProjectId,
                    users: onlineUsers
                }
            );

        } catch (error) {

            console.error(
                "Project leave error:",
                error
            );
        }
    });


    // ============================================
    // SOCKET DISCONNECT
    // ============================================

    socket.on("disconnect", () => {

        console.log(
            "SOCKET DISCONNECTED:",
            socket.id,
            "user:",
            socket.userId
        );

        // -----------------------------
        // Get all projects
        // this socket joined
        // -----------------------------

        for (const projectId of socket.joinedProjects) {

            const users =
                projectUsers.get(projectId);

            if (!users) {
                continue;
            }

            // -----------------------------
            // Remove socket
            // -----------------------------

            users.delete(socket.id);

            const room =
                `project:${projectId}`;

            // -----------------------------
            // Remove empty project map
            // -----------------------------

            if (users.size === 0) {

                projectUsers.delete(
                    projectId
                );

                continue;
            }

            // -----------------------------
            // Get remaining users
            // -----------------------------

            const onlineUsers =
                getOnlineUsers(projectId);

            // -----------------------------
            // Notify remaining clients
            // -----------------------------

            io.to(room).emit(
                "presence:update",
                {
                    projectId,
                    users: onlineUsers
                }
            );

            console.log(
                `User ${socket.userId} went offline from project:${projectId}`
            );
        }

        // -----------------------------
        // Clear joined projects
        // -----------------------------

        socket.joinedProjects.clear();
    });

    socket.on(
        "collab:update",
        ({ projectId, update }) => {

            try {

                const numericProjectId =
                    Number(projectId);

                if (
                    Number.isNaN(
                        numericProjectId
                    )
                ) {
                    return;
                }

                // Make sure socket joined this project
                if (
                    !socket.joinedProjects.has(
                        numericProjectId
                    )
                ) {
                    return;
                }

                // Validate update
                if (!Array.isArray(update)) {
                    return;
                }

                const room =
                    `project:${numericProjectId}`;

                // Get server-side Y.Doc
                const ydoc =
                    getProjectDoc(
                        numericProjectId
                    );

                // Convert array back to Uint8Array
                const binaryUpdate =
                    new Uint8Array(update);

                // Store update in server Y.Doc
                Y.applyUpdate(
                    ydoc,
                    binaryUpdate
                );

                // Send update to other users
                socket.to(room).emit(
                    "collab:update",
                    {
                        projectId:
                            numericProjectId,

                        update
                    }
                );

            } catch (error) {

                console.error(
                    "Collaboration update error:",
                    error
                );
            }
        }
    );
    socket.on(
        "collab:sync-request",
        ({ projectId }) => {

            try {

                const numericProjectId =
                    Number(projectId);

                if (
                    Number.isNaN(
                        numericProjectId
                    )
                ) {
                    return;
                }

                if (
                    !socket.joinedProjects.has(
                        numericProjectId
                    )
                ) {
                    return;
                }

                const ydoc =
                    getProjectDoc(
                        numericProjectId
                    );

                const state =
                    Y.encodeStateAsUpdate(
                        ydoc
                    );

                socket.emit(
                    "collab:sync",
                    {
                        projectId:
                            numericProjectId,

                        update:
                            Array.from(state)
                    }
                );

            } catch (error) {

                console.error(
                    "Collaboration sync error:",
                    error
                );
            }
        }
    );

    socket.on("collab:cursor", async (data) => {
        try {
            const numericProjectId = Number(data.projectId);

            const position = data.position;

            const user = await prisma.user.findUnique({
                where: {
                    id: Number(socket.userId)
                },
                select: {
                    id: true,
                    username: true
                }
            });

            if (!user) {
                return;
            }

            const room = `project:${numericProjectId}`;

            socket.to(room).emit(
                "collab:cursor",
                {
                    projectId: numericProjectId,

                    userId: user.id,

                    username: user.username,

                    position: {
                        lineNumber: position.lineNumber,
                        column: position.column
                    }
                }
            );
        } catch (error) {
            console.error(
                "Error broadcasting cursor:",
                error
            );
        }
    });
};

module.exports = projectSocketHandler;