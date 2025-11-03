const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const trackingRoutes = require("./utils/backend/routes/trackingRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use((req, res, next) => {
    console.log(new Date().toISOString() + " - " + req.method + " " + req.path);
    next();
});

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ai-assistant";

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => {
        console.log("✅ MongoDB Connected Successfully");
        console.log("📊 Database: " + mongoose.connection.name);
    })
    .catch((err) => {
        console.error("❌ MongoDB Connection Error: " + err);
        process.exit(1);
    });

mongoose.connection.on("disconnected", () => {
    console.log("⚠️ MongoDB Disconnected");
});

mongoose.connection.on("reconnected", () => {
    console.log("✅ MongoDB Reconnected");
});

app.use("/api/tracking", trackingRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "AI Assistant Backend API",
        version: "2.0.0",
        status: "running"
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        timestamp: new Date().toISOString()
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Endpoint not found",
        path: req.path
    });
});

app.use((err, req, res, next) => {
    console.error("Server Error: " + err);
    res.status(500).json({
        success: false,
        error: err.message || "Internal server error"
    });
});

app.listen(PORT, () => {
    console.log("");
    console.log("🚀 Server running on port " + PORT);
    console.log("🚀 API Base URL: http://localhost:" + PORT + "/api");
    console.log("🚀 Tracking API: http://localhost:" + PORT + "/api/tracking");
    console.log("");
});

process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server");
    mongoose.connection.close(false, () => {
        console.log("MongoDB connection closed");
        process.exit(0);
    });
});

module.exports = app;