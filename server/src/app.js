const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.js");

const app = express();

app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

app.use(express.json());
app.use(cookieParser());

app.get("/api", (req, res) => {
    res.json({
        status: "ok",
        message: "Collaborative AI IDE backend is running",
    });
});

app.use("/api/auth", authRoutes);

module.exports = app;