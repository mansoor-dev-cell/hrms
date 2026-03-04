const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Admin = require("./models/admin");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// Routes test
app.get("/", (req, res) => {
  res.send("HRMS Backend Running");
});

const PORT = 5000;
app.listen(PORT, () => console.log("Server running on port 5000"));

// Create Admin
app.post("/create-admin", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      name,
      email,
      password: hashedPassword
    });

    await newAdmin.save();

    res.json({ message: "Admin created successfully", admin: newAdmin });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});