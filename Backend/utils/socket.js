const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173" }
});

let rooms = {};
let userSocketMap = {}; // Map userId to socketId

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", ({ roomId, userId }) => {
    if (!rooms[roomId]) rooms[roomId] = new Set();
    rooms[roomId].add(userId);
    userSocketMap[userId] = socket.id;
    socket.join(roomId);

    console.log(`User ${userId} joined room ${roomId}`);
    console.log("Current rooms:", rooms);
    
    // Notify other users in the room that this user joined
    socket.to(roomId).emit("user-joined", { userId });

    socket.on("signal", ({ to, data }) => {
      console.log(`Signal from ${userId} to ${to}`);
      const targetSocketId = userSocketMap[to];
      if (targetSocketId) {
        io.to(targetSocketId).emit("signal", { from: userId, data });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", userId);
      if (rooms[roomId]) {
        rooms[roomId].delete(userId);
        if (rooms[roomId].size === 0) {
          delete rooms[roomId];
        }
      }
      delete userSocketMap[userId];
      socket.to(roomId).emit("user-left", { userId });
    });
  });
});

module.exports = {
    server,io,app
};
