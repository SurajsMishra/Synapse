const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const app = require("./src/app");
const initializeSocket = require("./src/socket");

dotenv.config();

const server = http.createServer(app);

const PORT = process.env.PORT || 8080;

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true
    }
});
initializeSocket(io);

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
});
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});