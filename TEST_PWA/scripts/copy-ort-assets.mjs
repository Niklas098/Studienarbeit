import { cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const sourceDir = path.resolve("node_modules/onnxruntime-web/dist");
const targetDir = path.resolve("public/ort");

async function main() {
  await mkdir(targetDir, { recursive: true });
  const files = await readdir(sourceDir);
  const wasmFiles = files.filter((file) => file.endsWith(".wasm") || file.endsWith(".mjs"));

  await Promise.all(
    wasmFiles.map((file) => {
      return cp(path.join(sourceDir, file), path.join(targetDir, file), { force: true });
    })
  );

  console.log(`Copied ${wasmFiles.length} ONNX Runtime Web assets to public/ort`);
}

main().catch((error) => {
  console.warn("Could not copy ONNX Runtime assets:", error.message);
});
