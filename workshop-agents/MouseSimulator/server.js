/**
 * Mouse Simulator agent — local HTTP (default 4011).
 * Reads mouse-profiles.json; Forge Workshop exports the same shape.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = __dirname;
const PORT = Number(process.env.MOUSE_SIM_PORT || 4011);
const PROFILES = path.join(ROOT, "mouse-profiles.json");

function corsOrigin(req) {
  const o = req.headers.origin;
  if (!o) return null;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(o)) return o;
  return null;
}

function applyCors(req, res) {
  const o = corsOrigin(req);
  if (!o) return;
  res.setHeader("Access-Control-Allow-Origin", o);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function loadProfiles() {
  if (!fs.existsSync(PROFILES)) return { version: 1, profiles: [] };
  return JSON.parse(fs.readFileSync(PROFILES, "utf8"));
}

function findProfile(id) {
  const data = loadProfiles();
  return (data.profiles || []).find((p) => p.id === id);
}

/** Windows: run steps via PowerShell (move/click/delay). */
function runProfileSteps(profile) {
  const lines = ['Add-Type -AssemblyName System.Windows.Forms'];
  for (const step of profile.steps || []) {
    if (step.type === "delay") {
      lines.push(`Start-Sleep -Milliseconds ${Number(step.ms) || 100}`);
    } else if (step.type === "move") {
      lines.push(
        `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${Number(step.x) || 0}, ${Number(step.y) || 0})`
      );
    } else if (step.type === "click") {
      const btn = step.button === "right" ? "Right" : "Left";
      lines.push(
        `Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);' -Name U32 -Namespace W; [W.U32]::mouse_event(${btn === "Right" ? 0x0008 : 0x0002}, 0, 0, 0, 0); [W.U32]::mouse_event(${btn === "Right" ? 0x0010 : 0x0004}, 0, 0, 0, 0)`
      );
    }
  }
  const ps = lines.join("; ");
  spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  }).unref();
}

const server = http.createServer((req, res) => {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { ok: true, name: "Mouse Simulator Agent", root: ROOT, profiles: PROFILES });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/run-profile") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const j = JSON.parse(body || "{}");
        const profile = findProfile(j.id);
        if (!profile) {
          sendJson(res, 404, { ok: false, error: "Profile not found" });
          return;
        }
        runProfileSteps(profile);
        sendJson(res, 200, { ok: true, id: profile.id, name: profile.name });
      } catch (e) {
        sendJson(res, 500, { ok: false, error: e.message || String(e) });
      }
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Mouse Simulator agent — POST /api/run-profile { id }\n");
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Mouse Simulator agent http://127.0.0.1:${PORT}`);
});
