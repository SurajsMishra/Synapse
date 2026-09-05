const socketAuth = require("./auth");
const projectSocketHandler = require("./project");

const initializeSocket = (io) => {

    io.use(socketAuth);

    io.on("connection", (socket) => {

        console.log(
            "Authenticated socket:",
            socket.id,
            "userId:",
            socket.userId
        );

        projectSocketHandler(io, socket);

        socket.on("disconnect", () => {

            console.log(
                "Socket disconnected:",
                socket.id
            );

        });

    });

};

module.exports = initializeSocket;