import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const firmwarePath = resolve(root, "tests/esp32s3-runtime-smoke/build/merged-flash.bin");
const firmwareStat = await stat(firmwarePath);
assert.ok(firmwareStat.size > 4096, "Le BIN fusionné ESP32-S3 est absent ou trop petit.");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".bin": "application/octet-stream"
};

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const relative = pathname === "/" ? "/app/" : pathname;
    const filePath = resolve(root, `.${relative}`);
    if (filePath !== root && !filePath.startsWith(root + sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    let target = filePath;
    if (pathname.endsWith("/")) target = resolve(filePath, "index.html");
    const body = await readFile(target);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(target)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "Cross-Origin-Resource-Policy": "same-origin"
    });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

await new Promise((resolveListen, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolveListen);
});
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") pageErrors.push(message.text());
  });

  await page.goto(`${baseUrl}/app/`, { waitUntil: "networkidle" });
  await page.locator("#firmware-file").setInputFiles(firmwarePath);
  await page.waitForFunction(() => {
    const info = document.querySelector("#firmware-file-info")?.textContent || "";
    return info.includes("SHA-256") && !info.includes("Aucun firmware");
  }, undefined, { timeout: 15000 });

  await page.locator("#firmware-load").click();
  await page.waitForFunction(() => {
    const status = document.querySelector("#firmware-runtime-status");
    return status?.dataset.state === "success" &&
      status.textContent.includes("BIN chargé dans le moteur");
  }, undefined, { timeout: 60000 });

  await page.locator("#firmware-start").click();
  await page.waitForFunction(() => {
    const output = document.querySelector("#firmware-console")?.textContent || "";
    return output.includes("CARDPUTER_RUNTIME_OK");
  }, undefined, { timeout: 90000 });

  await page.locator("#firmware-stop").click();
  await page.waitForFunction(() => {
    const status = document.querySelector("#firmware-runtime-status")?.textContent || "";
    return status.includes("Exécution arrêtée");
  }, undefined, { timeout: 10000 });

  assert.deepEqual(pageErrors, [], "Le navigateur a signalé des erreurs JavaScript.");
  console.log("PASS: BIN ESP32-S3 chargé dans ESP-EMU WebAssembly.");
  console.log("PASS: CPU Xtensa démarré et marqueur CARDPUTER_RUNTIME_OK reçu sur UART0.");
  console.log("PASS: arrêt du CPU confirmé depuis l'interface Cardputer ADV Virtual.");
} finally {
  if (browser) await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
