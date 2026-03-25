import express from "express";

const PORT = process.env.PORT ?? 3000;

const app = express();

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from the backend!" });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
