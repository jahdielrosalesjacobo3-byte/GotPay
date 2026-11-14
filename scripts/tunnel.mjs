import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const LOG_DIR = path.join(process.cwd(), ".swarm", "logs");
const WEBHOOK_PATH = "/api/webhooks/pey";

function printCloudflaredInstallHelp() {
  console.log("");
  console.log("cloudflared no está instalado.");
  console.log("");
  console.log("Para instalarlo en macOS con Homebrew:");
  console.log("  brew install cloudflared");
  console.log("");
  console.log("Luego ejecuta:");
  console.log("  npm run tunnel");
  console.log("");
  console.log(
    `Registra en portal.mipey.mx la URL pública + ${WEBHOOK_PATH}`,
  );
}

async function main() {
  const probe = spawn("which", ["cloudflared"], { stdio: "pipe" });
  const whichCode = await new Promise((resolve) => {
    probe.on("close", resolve);
  });
  if (whichCode !== 0) {
    printCloudflaredInstallHelp();
    process.exit(1);
  }

  fs.mkdirSync(LOG_DIR, { recursive: true });
  const logPath = path.join(LOG_DIR, "tunnel.log");
  const logStream = fs.createWriteStream(logPath, { flags: "a" });

  console.log("Iniciando túnel HTTPS hacia http://localhost:3000 ...");
  console.log(`Log: ${logPath}`);
  console.log("");

  const child = spawn(
    "cloudflared",
    ["tunnel", "--url", "http://localhost:3000"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  let printedWebhookHint = false;

  function announcePublicUrl(line) {
    const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (!match || printedWebhookHint) {
      return;
    }
    printedWebhookHint = true;
    const base = match[0].replace(/\/$/, "");
    console.log("");
    console.log("URL pública del túnel:");
    console.log(`  ${base}`);
    console.log("");
    console.log("Webhook pey (POST):");
    console.log(`  ${base}${WEBHOOK_PATH}`);
    console.log("");
  }

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    logStream.write(text);
    for (const line of text.split("\n")) {
      announcePublicUrl(line);
    }
  });

  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    process.stderr.write(text);
    logStream.write(text);
    for (const line of text.split("\n")) {
      announcePublicUrl(line);
    }
  });

  child.on("close", (code) => {
    logStream.end();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});