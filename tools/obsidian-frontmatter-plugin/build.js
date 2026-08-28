const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

const isWatch = process.argv.includes("--watch");

async function build() {
  const context = await esbuild.context({
    entryPoints: ["main.js"],
    bundle: true,
    external: ["obsidian", "node:child_process", "node:path"],
    platform: "node",
    format: "cjs",
    target: "es2018",
    logLevel: "info",
    sourcemap: isWatch ? "inline" : false,
    outfile: "dist/main.js",
    minify: !isWatch
  });

  if (isWatch) {
    await context.watch();
    console.log("Watching for changes...");
  } else {
    await context.rebuild();
    await context.dispose();

    // Copy manifest.json to dist
    fs.copyFileSync(
      path.join(__dirname, "manifest.json"),
      path.join(__dirname, "dist", "manifest.json")
    );

    // Copy styles.css to dist if it exists
    const stylesPath = path.join(__dirname, "styles.css");
    if (fs.existsSync(stylesPath)) {
      fs.copyFileSync(stylesPath, path.join(__dirname, "dist", "styles.css"));
    }

    console.log("Build complete!");
  }
}

build().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
