const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

const socketAuth = async (socket, next) => {

    try {

        // ============================================
        // GET COOKIES
        // ============================================

        const cookies =
            socket.handshake.headers.cookie;

        if (!cookies) {

            return next(
                new Error("Authentication required")
            );
        }


        // ============================================
        // FIND TOKEN COOKIE
        // ============================================

        const tokenCookie =
            cookies
                .split(";")
                .find(cookie =>
                    cookie
                        .trim()
                        .startsWith("token=")
                );

        if (!tokenCookie) {

            return next(
                new Error("Authentication required")
            );
        }


        // ============================================
        // EXTRACT TOKEN
        // ============================================

        const token =
            tokenCookie
                .split("=")
                .slice(1)
                .join("=");

        if (!token) {

            return next(
                new Error("Authentication required")
            );
        }


        // ============================================
        // VERIFY JWT
        // ============================================

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );


        // ============================================
        // FIND USER
        // ============================================

        const user =
            await prisma.user.findUnique({
                where: {
                    id: Number(decoded.userId)
                },
                select: {
                    id: true,
                    username: true
                }
            });


        if (!user) {

            return next(
                new Error("User not found")
            );
        }


        // ============================================
        // ATTACH USER TO SOCKET
        // ============================================

        socket.userId = user.id;

        socket.user = {
            id: user.id,
            username: user.username
        };


        console.log(
            "Socket authenticated:",
            socket.id,
            "userId:",
            socket.user.id,
            "username:",
            socket.user.username
        );


        next();

    } catch (error) {

        console.error(
            "Socket authentication failed:",
            error.message
        );

        next(
            new Error("Invalid or expired token")
        );
    }
};

module.exports = socketAuth;