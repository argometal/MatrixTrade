/**
 * P14C — spawn Next with canonical env in the SAME process tree.
 * `node register.cjs && next` cannot work: register exits before Next starts.
 */
const { spawn } = require("node:child_process");
const path = require("node:path");

require("./register-local-env.cjs");

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("usage: node tools/mxt-next.cjs <next-args>");
  process.exit(1);
}

const nextBin = path.join(
  __dirname,
  "..",
  "node_modules",
  "next",
  "dist",
  "bin",
  "next"
);

const child = spawn(process.execPath, [nextBin, ...args], {
  stdio: "inherit",
  env: process.env,
  cwd: path.join(__dirname, ".."),
  windowsHide: true,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
