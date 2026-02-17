import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync } from "fs";

const isWatch = process.argv.includes("--watch");

const buildOptions = {
  entryPoints: {
    background: "src/background.ts",
    content: "src/content.ts",
    "popup/popup": "src/popup/popup.ts",
    "options/options": "src/options/options.ts",
  },
  bundle: true,
  outdir: "dist",
  format: "iife",
  target: ["chrome90"],
  sourcemap: true,
};

function copyStaticFiles() {
  mkdirSync("dist/popup", { recursive: true });
  mkdirSync("dist/options", { recursive: true });
  mkdirSync("dist/icons", { recursive: true });
  cpSync("manifest.json", "dist/manifest.json");
  cpSync("src/popup/popup.html", "dist/popup/popup.html");
  cpSync("src/popup/popup.css", "dist/popup/popup.css");
  cpSync("src/options/options.html", "dist/options/options.html");
  cpSync("src/options/options.css", "dist/options/options.css");
  cpSync("guardrailLogo.png", "dist/icons/icon-128.png");
}

rmSync("dist", { recursive: true, force: true });

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  copyStaticFiles();
  await ctx.watch();
  console.log("[Guardrail] Watching for changes...");
} else {
  await esbuild.build(buildOptions);
  copyStaticFiles();
  console.log("[Guardrail] Build complete → dist/");
}
