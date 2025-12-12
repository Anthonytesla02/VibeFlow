import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { promisify } from "util";

const execAsync = promisify(exec);

interface ExtractResult {
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  audioPath: string;
}

const YTDLP_PATH = path.join(process.cwd(), "yt-dlp");
const COOKIES_PATH = path.join(process.cwd(), "cookies.txt");

function getYtDlpCommand(): string {
  if (fs.existsSync(YTDLP_PATH)) {
    return YTDLP_PATH;
  }
  return "yt-dlp";
}

function getCookiesArg(): string {
  if (fs.existsSync(COOKIES_PATH)) {
    return `--cookies "${COOKIES_PATH}"`;
  }
  return "";
}

export function hasCookies(): boolean {
  return fs.existsSync(COOKIES_PATH);
}

export function saveCookies(content: string): void {
  fs.writeFileSync(COOKIES_PATH, content, "utf-8");
}

export function deleteCookies(): void {
  if (fs.existsSync(COOKIES_PATH)) {
    fs.unlinkSync(COOKIES_PATH);
  }
}

export async function extractAudio(url: string, userId: number): Promise<ExtractResult> {
  const audioDir = path.join(process.cwd(), "uploads", "audio");
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  const tempId = `${userId}_${Date.now()}`;
  const outputTemplate = path.join(audioDir, `${tempId}.%(ext)s`);
  const ytdlp = getYtDlpCommand();
  const cookiesArg = getCookiesArg();

  try {
    const infoResult = await execAsync(
      `${ytdlp} ${cookiesArg} --no-warnings --print "%(title)s|||%(uploader)s|||%(duration)s|||%(thumbnail)s" "${url}"`,
      { timeout: 60000 }
    );

    const [title, uploader, durationStr, thumbnail] = infoResult.stdout.trim().split("|||");
    const duration = parseInt(durationStr) || 0;

    await execAsync(
      `${ytdlp} ${cookiesArg} -x --audio-format mp3 --audio-quality 0 -o "${outputTemplate}" "${url}"`,
      { timeout: 300000 }
    );

    const audioPath = path.join(audioDir, `${tempId}.mp3`);
    
    if (!fs.existsSync(audioPath)) {
      const files = fs.readdirSync(audioDir).filter(f => f.startsWith(tempId));
      if (files.length > 0) {
        const actualFile = path.join(audioDir, files[0]);
        if (actualFile !== audioPath) {
          fs.renameSync(actualFile, audioPath);
        }
      }
    }

    if (!fs.existsSync(audioPath)) {
      throw new Error("Audio file was not created");
    }

    let artist = "YouTube Import";
    let songTitle = title || "Unknown Title";
    
    if (title && title.includes(" - ")) {
      const parts = title.split(" - ");
      artist = parts[0].trim();
      songTitle = parts.slice(1).join(" - ").trim();
    } else if (uploader) {
      artist = uploader.replace(/ - Topic$/, "").replace(/VEVO$/i, "");
    }

    return {
      title: songTitle,
      artist,
      duration,
      thumbnail: thumbnail || `https://picsum.photos/seed/${tempId}/200/200`,
      audioPath,
    };
  } catch (error: any) {
    console.error("yt-dlp error:", error.message);
    
    if (error.message?.includes("Sign in to confirm you're not a bot") || 
        error.message?.includes("confirm you're not a bot") ||
        error.stderr?.includes("Sign in to confirm you're not a bot")) {
      throw new Error("YouTube requires authentication. Please upload a cookies.txt file from your browser to enable downloads.");
    }
    if (error.message?.includes("Video unavailable")) {
      throw new Error("This video is unavailable or private");
    }
    if (error.message?.includes("age-restricted")) {
      throw new Error("This video is age-restricted. You may need to upload cookies from a logged-in YouTube account.");
    }
    throw new Error("Failed to extract audio. Please check the URL and try again.");
  }
}
