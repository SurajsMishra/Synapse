import * as Y from "yjs";

export class SocketProvider {
    constructor(socket, projectId, ydoc) {
        this.socket = socket;
        this.projectId = projectId;
        this.ydoc = ydoc;

        this.handleRemoteUpdate =
            this.handleRemoteUpdate.bind(this);

        this.handleLocalUpdate =
            this.handleLocalUpdate.bind(this);

        this.handleSync =
            this.handleSync.bind(this);
    }

    connect() {

        this.socket.on(
            "collab:update",
            this.handleRemoteUpdate
        );

        this.socket.on(
            "collab:sync",
            this.handleSync
        );

        this.ydoc.on(
            "update",
            this.handleLocalUpdate
        );
    }

    handleLocalUpdate(update, origin) {
        // Don't send updates received from another client
        if (origin === "remote") {
            return;
        }

        this.socket.emit(
            "collab:update",
            {
                projectId: this.projectId,
                update: Array.from(update)
            }
        );
    }

    handleRemoteUpdate(data) {
        if (
            Number(data.projectId) !==
            Number(this.projectId)
        ) {
            return;
        }

        const update =
            new Uint8Array(data.update);

        Y.applyUpdate(
            this.ydoc,
            update,
            "remote"
        );
    }

    destroy() {
        this.socket.off(
            "collab:update",
            this.handleRemoteUpdate
        );

        this.socket.off(
            "collab:sync",
            this.handleSync
        );

        this.ydoc.off(
            "update",
            this.handleLocalUpdate
        );
    }

    handleSync(data) {

        if (
            Number(data.projectId) !==
            Number(this.projectId)
        ) {
            return;
        }

        const update =
            new Uint8Array(data.update);

        Y.applyUpdate(
            this.ydoc,
            update,
            "remote"
        );
    }
    requestSync() {

        this.socket.emit(
            "collab:sync-request",
            {
                projectId:
                    this.projectId
            }
        );
    }
}