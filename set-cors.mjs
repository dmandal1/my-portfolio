/**
 * Sets CORS configuration on Firebase Storage bucket using
 * the Google Cloud Storage JSON API with Firebase CLI credentials.
 */
import { readFileSync } from "fs";
import { homedir } from "os";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const https = require("https");

// CORS configuration – allows localhost:3000 and the production domain
const corsConfig = [
  {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://deepakmandal.dev",
      "https://www.deepakmandal.dev",
    ],
    method: ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"],
    maxAgeSeconds: 3600,
    responseHeader: [
      "Content-Type",
      "Authorization",
      "Content-Length",
      "X-Requested-With",
    ],
  },
];

// Firebase CLI OAuth2 credentials (public, from open-source firebase-tools)
const FIREBASE_CLIENT_ID =
  "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const FIREBASE_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";

// Read Firebase CLI stored tokens
const configPath =
  homedir() + "/.config/configstore/firebase-tools.json";
let tokens;
try {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  tokens = config.tokens;
} catch (e) {
  console.error("Could not read Firebase CLI config:", e.message);
  process.exit(1);
}

if (!tokens || !tokens.refresh_token) {
  console.error(
    "No refresh_token found in Firebase CLI config.\nPlease run: firebase login"
  );
  process.exit(1);
}

// Refresh the access token using the stored refresh token
function refreshAccessToken(refreshToken) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: FIREBASE_CLIENT_ID,
      client_secret: FIREBASE_CLIENT_SECRET,
      refresh_token: refreshToken,
    }).toString();
    const opts = {
      hostname: "oauth2.googleapis.com",
      path: "/token",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        const parsed = JSON.parse(data);
        if (res.statusCode === 200 && parsed.access_token) {
          resolve(parsed.access_token);
        } else {
          reject(new Error("Token refresh failed: " + data));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

console.log("Refreshing access token...");
const accessToken = await refreshAccessToken(tokens.refresh_token);
console.log("Token refreshed successfully.");
// Bucket name from error: deepakmandal-dev.firebasestorage.app
// For GCS API, the bucket name must be URL-encoded
const bucket = "deepakmandal-dev.firebasestorage.app";
const encodedBucket = encodeURIComponent(bucket);

const body = JSON.stringify(corsConfig);

const options = {
  hostname: "storage.googleapis.com",
  path: `/storage/v1/b/${encodedBucket}?fields=cors`,
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  },
};

console.log(`Setting CORS on bucket: ${bucket}`);
console.log("CORS config:", JSON.stringify(corsConfig, null, 2));

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    if (res.statusCode === 200) {
      console.log("\n✅ CORS configured successfully!");
      console.log("Response:", data);
    } else if (res.statusCode === 401) {
      console.error(
        "\n❌ Access token expired. Run `firebase login` to refresh, then retry."
      );
      console.error("Response:", data);
    } else {
      console.error(`\n❌ Failed (HTTP ${res.statusCode}):`, data);
    }
  });
});

req.on("error", (e) => {
  console.error("Request error:", e.message);
});

req.write(body);
req.end();
