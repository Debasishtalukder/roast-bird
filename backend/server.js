const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const cors = require("cors");
const express = require("express");
const ttsRoute = require("./routes/tts");

const app = express();
const PORT = process.env.PORT || 3000;
const frontendPath = path.join(__dirname, "..", "frontend");

app.use(cors());
app.use(express.json({ limit: "32kb" }));
app.use(express.static(frontendPath));
app.use("/api/speak", ttsRoute);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "roast-bird" });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`ROAST BIRD server running at http://localhost:${PORT}`);
});
