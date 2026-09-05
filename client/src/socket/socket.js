import { io } from "socket.io-client";

const socket = io("http://localhost:8080", {
    autoConnect: false,

    reconnection: true,

    reconnectionAttempts: Infinity,

    reconnectionDelay: 1000,

    reconnectionDelayMax: 5000,

    timeout: 20000,

    withCredentials: true
});

export default socket;