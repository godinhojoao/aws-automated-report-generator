const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const buildFile = path.join(__dirname, "..", "build", "index.js");
const templatesDir = path.join(__dirname, "..", "src", "templates");
const buildTemplatesDir = path.join(__dirname, "..", "build", "templates");

esbuild
  .build({
    entryPoints: ["src/index.js"],
    bundle: true,
    platform: "node",
    target: "node22",
    format: "cjs",
    outfile: buildFile,
    minify: true,
    external: ["@aws-sdk/client-s3", "xlsx", "ejs", "html-minifier"], // do not bundle these dependencies
  })
  .then(() => {
    console.log("Build complete");

    if (!fs.existsSync(buildFile)) {
      console.error("build/index.js not found");
      process.exit(1);
    }

    // Copy templates directory to build
    if (fs.existsSync(templatesDir)) {
      if (!fs.existsSync(buildTemplatesDir)) {
        fs.mkdirSync(buildTemplatesDir, { recursive: true });
      }

      // Copy template files
      const templateFiles = fs.readdirSync(templatesDir).filter(f => f.endsWith('.ejs'));
      templateFiles.forEach(file => {
        fs.copyFileSync(
          path.join(templatesDir, file),
          path.join(buildTemplatesDir, file)
        );
      });

      console.log("Templates copied to build directory");
      console.log(`  Copied ${templateFiles.length} template files: ${templateFiles.join(", ")}`);
    } else {
      console.warn("WARNING: templates directory not found - templates will not be included in deployment!");
    }

    let content = fs.readFileSync(buildFile, "utf8");

    content = content.replace(/`([^`]*(?:\$\{[^}]*\}[^`]*)*)`/g, (match, templateContent) => {
      const minified = templateContent
        .replace(/\n\s*/g, "")
        .replace(/\s+/g, " ")
        .replace(/\s*([<>])\s*/g, "$1")
        .trim();
      return "`" + minified + "`";
    });

    content = content.replace(/\n\s*/g, "").replace(/\s+/g, " ").trim();

    fs.writeFileSync(buildFile, content, "utf8");
    console.log("Whitespace removed from template literals");
  })
  .catch(() => process.exit(1));

