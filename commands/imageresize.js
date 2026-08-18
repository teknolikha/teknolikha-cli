const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

module.exports = function (program) {
  const command = program
    .command("imageresize")
    .description("Resize images while maintaining aspect ratio")

    .argument(
      "[image]",
      "Image to resize. If omitted, all images in the current directory are processed.",
    )

    .requiredOption("--height <inches>", "Target height in inches", "36")

    .option(
      "-o, --output <folder>",
      "Output folder. Default: Desktop/[Month]/[Date]",
    )

    .option("-r, --recursive", "Process subfolders");

  command.action(async (image, options) => {
    // ========================================
    // CONFIGURATION
    // ========================================

    const DPI = 150;

    const SUPPORTED_EXTENSIONS = [
      ".png",
      ".jpg",
      ".jpeg",
      ".bmp",
      ".tif",
      ".tiff",
    ];

    // ========================================
    // DEFAULT OUTPUT DIRECTORY
    // ========================================

    function getDefaultOutputDirectory() {
      const now = new Date();

      const month = now.toLocaleString("en-US", {
        month: "long",
      });

      const date = String(now.getDate());

      const desktop = path.join(require("os").homedir(), "Desktop");

      return path.join(desktop, month, date);
    }

    const OUTPUT_DIR = options.output
      ? path.resolve(options.output)
      : getDefaultOutputDirectory();

    // ========================================
    // HEIGHT
    // ========================================

    const height = Number(options.height);

    if (!Number.isFinite(height) || height <= 0) {
      console.error("");
      console.error("❌ Height must be greater than 0.");

      console.error("");
      console.error("Example:");

      console.error("  teknolikha imageresize --height 36");

      console.error("");

      return;
    }

    // ========================================
    // HEADER
    // ========================================

    console.log("");

    console.log("========================================");

    console.log(" TeknoLikha Image Resizer");

    console.log("========================================");

    console.log("");

    console.log("Target height :", `${height} inches`);

    console.log("DPI           :", DPI);

    console.log("Output        :", OUTPUT_DIR);

    console.log("Recursive     :", options.recursive ? "Yes" : "No");

    console.log("");

    // ========================================
    // CREATE OUTPUT DIRECTORY
    // ========================================

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, {
        recursive: true,
      });
    }

    // ========================================
    // UNIQUE FILE NAME
    // ========================================

    function getUniqueOutputPath(directory, filename) {
      const parsed = path.parse(filename);

      let outputPath = path.join(directory, `${parsed.name}${parsed.ext}`);

      if (!fs.existsSync(outputPath)) {
        return outputPath;
      }

      let version = 1;

      while (true) {
        outputPath = path.join(
          directory,
          `${parsed.name}_v${version}${parsed.ext}`,
        );

        if (!fs.existsSync(outputPath)) {
          return outputPath;
        }

        version++;
      }
    }

    // ========================================
    // FIND IMAGES
    // ========================================

    let files = [];

    if (image) {
      const inputFile = path.resolve(image);

      if (!fs.existsSync(inputFile)) {
        console.error("");
        console.error(`❌ File not found: ${image}`);

        console.error("");

        return;
      }

      const ext = path.extname(inputFile).toLowerCase();

      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        console.error("");
        console.error(`❌ Unsupported image format: ${ext}`);

        console.error("");

        return;
      }

      files.push(inputFile);
    } else {
      function scanDirectory(directory) {
        let entries;

        try {
          entries = fs.readdirSync(directory, {
            withFileTypes: true,
          });
        } catch (error) {
          console.error(`❌ Cannot read directory: ${directory}`);

          return;
        }

        for (const entry of entries) {
          const fullPath = path.join(directory, entry.name);

          if (entry.isDirectory()) {
            // Don't scan output folder
            if (path.resolve(fullPath) === path.resolve(OUTPUT_DIR)) {
              continue;
            }

            if (options.recursive) {
              scanDirectory(fullPath);
            }

            continue;
          }

          if (!entry.isFile()) {
            continue;
          }

          const ext = path.extname(entry.name).toLowerCase();

          if (SUPPORTED_EXTENSIONS.includes(ext)) {
            files.push(path.resolve(fullPath));
          }
        }
      }

      scanDirectory(process.cwd());
    }

    // ========================================
    // NO FILES
    // ========================================

    if (files.length === 0) {
      console.log("⚠ No supported images found.");

      console.log("");

      return;
    }

    console.log(`Found ${files.length} image(s).`);

    console.log("");

    // ========================================
    // PROCESS IMAGE
    // ========================================

    function resizeImage(inputFile) {
      return new Promise((resolve) => {
        const parsed = path.parse(inputFile);

        const outputFile = getUniqueOutputPath(
          OUTPUT_DIR,
          `${parsed.name}.jpg`,
        );

        // Height in pixels
        const targetPixels = Math.round(height * DPI);

        console.log(`Processing: ${path.basename(inputFile)}`);

        console.log(`  Target height : ${height} inches`);

        console.log(`  Target pixels : ${targetPixels}px`);

        console.log("  Output        :", path.basename(outputFile));

        const args = [
          inputFile,

          "-units",
          "PixelsPerInch",

          "-resize",
          `x${targetPixels}`,

          "-density",
          String(DPI),

          "-quality",
          "100",

          outputFile,
        ];

        execFile(
          "magick",
          args,

          (error, stdout, stderr) => {
            if (error) {
              console.error("  ❌ Resize failed");

              console.error("  ", stderr || error.message);

              console.log("");

              resolve(false);

              return;
            }

            console.log("  ✓ Resize complete");

            console.log("  →", outputFile);

            console.log("");

            resolve(true);
          },
        );
      });
    }

    // ========================================
    // PROCESS ALL IMAGES
    // ========================================

    let success = 0;
    let failed = 0;

    for (const file of files) {
      const result = await resizeImage(file);

      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    // ========================================
    // SUMMARY
    // ========================================

    console.log("========================================");

    console.log(" Resize Complete");

    console.log("========================================");

    console.log("Processed :", files.length);

    console.log("Success   :", success);

    console.log("Failed    :", failed);

    console.log("Output    :", OUTPUT_DIR);

    console.log("========================================");

    console.log("");
  });
};
