const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
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