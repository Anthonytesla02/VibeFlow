import express from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { pool } from "./db";
import { storage } from "./storage";
import { extractAudio, hasCookies, saveCookies, deleteCookies } from "./youtube";
import path from "path";
import fs from "fs";

const app = express();
const PgSession = connectPgSimple(session);

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: "session",
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || "vibeflow-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: "lax",
  },
}));

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

const audioDir = path.join(process.cwd(), "uploads", "audio");
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

app.use("/audio", express.static(audioDir));

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existing = await storage.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await storage.createUser({
      email,
      password: hashedPassword,
      displayName,
    });

    req.session.userId = user.id;
    res.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.userId = user.id;
    res.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

app.get("/api/auth/me", async (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.json({ user: null });
  }

  res.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
});

app.get("/api/songs", requireAuth, async (req, res) => {
  try {
    const songs = await storage.getSongsByUserId(req.session.userId!);
    const songsWithUrls = songs.map(song => ({
      ...song,
      audioUrl: song.audioPath ? `/audio/${path.basename(song.audioPath)}` : null,
    }));
    res.json(songsWithUrls);
  } catch (error) {
    console.error("Get songs error:", error);
    res.status(500).json({ error: "Failed to fetch songs" });
  }
});

app.post("/api/songs", requireAuth, async (req, res) => {
  try {
    const { title, artist, album, coverUrl, duration, genre, sourceType } = req.body;
    
    const song = await storage.createSong({
      id: crypto.randomUUID(),
      userId: req.session.userId!,
      title,
      artist,
      album,
      coverUrl,
      duration,
      genre,
      sourceType,
    });

    res.json(song);
  } catch (error) {
    console.error("Create song error:", error);
    res.status(500).json({ error: "Failed to save song" });
  }
});

app.post("/api/songs/:id/favorite", requireAuth, async (req, res) => {
  try {
    const { isFavorite } = req.body;
    const song = await storage.updateSong(req.params.id, { isFavorite });
    res.json(song);
  } catch (error) {
    console.error("Update favorite error:", error);
    res.status(500).json({ error: "Failed to update" });
  }
});

app.delete("/api/songs/:id", requireAuth, async (req, res) => {
  try {
    const song = await storage.getSongById(req.params.id);
    if (song?.audioPath && fs.existsSync(song.audioPath)) {
      fs.unlinkSync(song.audioPath);
    }
    await storage.deleteSong(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete song error:", error);
    res.status(500).json({ error: "Failed to delete" });
  }
});

app.post("/api/youtube/extract", requireAuth, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const result = await extractAudio(url, req.session.userId!);
    
    const song = await storage.createSong({
      id: crypto.randomUUID(),
      userId: req.session.userId!,
      title: result.title,
      artist: result.artist,
      coverUrl: result.thumbnail,
      audioPath: result.audioPath,
      duration: result.duration,
      sourceType: "youtube",
      sourceUrl: url,
    });

    res.json({
      ...song,
      audioUrl: `/audio/${path.basename(result.audioPath)}`,
    });
  } catch (error: any) {
    console.error("YouTube extraction error:", error);
    res.status(500).json({ error: error.message || "Failed to extract audio" });
  }
});

app.get("/api/youtube/cookies", requireAuth, (req, res) => {
  res.json({ hasCookies: hasCookies() });
});

app.post("/api/youtube/cookies", requireAuth, (req, res) => {
  try {
    const { cookies } = req.body;
    
    if (!cookies || typeof cookies !== "string") {
      return res.status(400).json({ error: "Cookies content is required" });
    }

    if (!cookies.includes("youtube.com") && !cookies.includes(".youtube.com")) {
      return res.status(400).json({ error: "Invalid cookies file. Must contain YouTube cookies." });
    }

    saveCookies(cookies);
    res.json({ success: true, message: "Cookies saved successfully" });
  } catch (error: any) {
    console.error("Save cookies error:", error);
    res.status(500).json({ error: "Failed to save cookies" });
  }
});

app.delete("/api/youtube/cookies", requireAuth, (req, res) => {
  try {
    deleteCookies();
    res.json({ success: true, message: "Cookies deleted" });
  } catch (error: any) {
    console.error("Delete cookies error:", error);
    res.status(500).json({ error: "Failed to delete cookies" });
  }
});

const PORT = 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
