const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const authRoutes = require("./Routes/authRoutes");
const connectDB = require("./utils/connectDB");
const {server,app} = require("./utils/socket");
dotenv.config();

connectDB();


const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}))
app.use("/api/auth",authRoutes);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});






