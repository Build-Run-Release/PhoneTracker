const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const path = require("path");

app.use(express.static(path.join(__dirname, "public")));

// Route to handle all pages (since we are using static HTMLs, this is just a catch-all)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Optional: Postgres Connection
const { Pool } = require('pg');
let pool = null;

if (process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    // Create Table if not exists
    pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
            id VARCHAR(50) PRIMARY KEY,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_agent TEXT
        )
    `).then(() => console.log("DB: Sessions table ready"))
        .catch(err => console.error("DB: Init error", err));
}

io.on("connection", (socket) => {
    console.log("A user connected");

    // Device joins a room based on its unique ID
    socket.on("join", (room) => {
        socket.join(room);
        console.log(`User joined room: ${room}`);

        // Log session if DB is available
        if (pool) {
            pool.query(`
                INSERT INTO sessions (id, last_seen) 
                VALUES ($1, NOW()) 
                ON CONFLICT (id) DO UPDATE SET last_seen = NOW()
            `, [room]).catch(err => console.error("DB: Save error", err));
        }
    });

    // Receive location update from the tracked device
    socket.on("update_location", (data) => {
        // Broadcast this location to everyone in the room (specifically the tracker)
        // data should contain { room: '123', latitude: ..., longitude: ... }
        io.to(data.room).emit("receive_location", data);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});

const PORT = 3000;
http.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
