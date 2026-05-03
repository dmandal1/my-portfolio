import FtpDeploy from "ftp-deploy";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs-extra";
import { execSync } from "child_process";

// 1. Load Environment Variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../");

// Clean FTP_HOST (remove ftp:// or ftps:// if present)
const rawHost = process.env.FTP_HOST || "";
const cleanHost = rawHost.replace(/^ftps?:\/\//, "").replace(/\/$/, "");

const config = {
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  host: cleanHost,
  port: 21,
  localRoot: path.join(rootDir, "dist"),
  remoteRoot: process.env.FTP_REMOTE_PATH || "/",
  include: ["*", "**/*"],
  exclude: [".git*", ".DS_Store", "node_modules/**", "config.php", "installed.lock"],
  deleteRemote: false,
  forcePasv: true,
  sftp: false,
};

async function deploy() {
  const args = process.argv.slice(2);
  const mode = args[0] || "all"; // all, frontend, backend

  console.log(`🚀 Starting Deployment [Mode: ${mode.toUpperCase()}] to Hostinger...`);

  try {
    const ftpDeploy = new FtpDeploy();
    
    // 1. Handle Frontend Deployment
    if (mode === "all" || mode === "frontend") {
      console.log("🔨 Building production bundle...");
      execSync("npm run build", { stdio: "inherit" });
      
      // Ensure we don't accidentally upload the local api folder if we are ONLY doing frontend
      if (mode === "frontend") {
        const apiDest = path.join(rootDir, "dist/api");
        if (fs.existsSync(apiDest)) await fs.remove(apiDest);
      }
    }

    // 2. Handle Backend Deployment
    if (mode === "all" || mode === "backend") {
      console.log("📂 Syncing backend files...");
      const backendSrc = path.join(rootDir, "backend");
      
      // EXCLUDE: Never upload the placeholder config.php as it will overwrite the server's real config
      config.exclude.push("config.php", "installed.lock");

      if (mode === "backend") {
        // If ONLY backend, we upload the backend folder directly to /api
        // We redefine localRoot for this specific upload
        config.localRoot = backendSrc;
        config.remoteRoot = path.join(process.env.FTP_REMOTE_PATH || "/", "api");
      } else {
        // If ALL, we copy backend to dist/api first
        const apiDest = path.join(rootDir, "dist/api");
        await fs.ensureDir(apiDest);
        if (fs.existsSync(backendSrc)) {
          await fs.copy(backendSrc, apiDest);
        }
      }
    }

    // 3. Run FTP Upload
    console.log("📤 Uploading files via FTP...");
    
    ftpDeploy.on("uploaded", (data) => {
      // Clear line and return cursor to start to prevent artifacting
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(`[${data.transferredFileCount}/${data.totalFilesCount}] Synchronized: ${data.filename}`);
    });

    await ftpDeploy.deploy(config);
    
    // Move to a new line for the final summary to preserve the last progress count
    process.stdout.write("\n");
    console.log(`✨ All ${config.include.length > 0 ? "requested" : ""} files synchronized successfully.`);
    
    console.log("\n✅ Deployment Complete!");
  } catch (err) {
    console.error("\n❌ Deployment Failed:", err.message);
    process.exit(1);
  }
}

deploy();
