import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import multer from "multer";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Server } from "socket.io";
import http from "http";
import OpenAI from "openai";
import Tesseract from "tesseract.js";
import WebSocket from "ws";
import fs from "fs";

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// MongoDB
mongoose.connect(process.env.MONGO_URI || "mongodb://mongo:27017/tradingai");

// Multer
const upload = multer({ dest: "uploads/" });

// OpenAI
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// User model
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});
const User = mongoose.model("User", userSchema);

// Auth routes
app.post("/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hash });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "User not found" });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: "Invalid credentials" });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.json({ token });
});

// Instruments list
const instruments = [
  { code: "R_100", name: "Volatility 100 Index" },
  { code: "R_75", name: "Volatility 75 Index" },
  { code: "R_50", name: "Volatility 50 Index" },
  { code: "R_25", name: "Volatility 25 Index" },
  { code: "R_10", name: "Volatility 10 Index" },
  { code: "BOOM1000", name: "Boom 1000 Index" },
  { code: "CRASH500", name: "Crash 500 Index" }
];
app.get("/api/instruments", (req, res) => res.json(instruments));

// Analyze chart endpoint
app.post("/api/analyze", upload.single("image"), async (req, res) => {
  try {
    const { balance, minLot } = req.body;
    let ocrText = req.body.ocrText || "";

    if (req.file) {
      const imagePath = req.file.path;
      const result = await Tesseract.recognize(imagePath, "eng");
      ocrText = result.data.text;
      fs.unlinkSync(imagePath);
    }

    const prompt = `You are an expert synthetic index analyst.
Analyze this trading chart data:
${ocrText}

Balance: ${balance}, Minimum lot size: ${minLot}

Output JSON strictly:
{
  "signal": "buy" or "sell",
  "index": "e.g. Volatility 75 Index",
  "entry_price": number,
  "take_profit": number,
  "stop_loss": number,
  "risk_comment": "text"
}`;

    const ai = await client.responses.create({
      model: "gpt-5",
      input: prompt,
    });

    const text = ai.output[0].content[0].text;
    const json = JSON.parse(text);
    res.json(json);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Live synthetic feed
const feed = new WebSocket("wss://ws.binaryws.com/websockets/v3?app_id=1089");
feed.on("open", () => {
  console.log("Connected to Deriv feed");
  for (const inst of instruments) {
    feed.send(JSON.stringify({ ticks: inst.code }));
  }
});
feed.on("message", (msg) => {
  const data = JSON.parse(msg);
  if (data.tick) {
    io.emit("tick", { symbol: data.tick.symbol, price: data.tick.quote });
  }
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("Client connected");
  socket.emit("tip", { message: "Welcome to Skaisignalbot live feed!" });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
