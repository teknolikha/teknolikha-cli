const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { Command } = require("commander");

module.exports = function (program) {
  const command = new Command("resize");

  command
    .description("Resize images and convert them to the default ICC profile")

    .argument(
      "[image]",
      "Image to process. If omitted, all images in the current directory are processed.",
    )

    .requiredOption("--height <inches>", "Target height in inches", "36")

    .option("-o, --output <folder>", "Output folder", "converted")

    .option("-q, --quality <0-100>", "JPEG quality", "100")

    .option("-r, --recursive", "Process subfolders");

  command.action(async (image, options) => {
    // ========================================
    // CONFIGURATION
    // ========================================

    const DEFAULT_ICC = "3PASS TARP";

    const PROFILE_DIR = path.join(__dirname, "..", "profiles");

    const OUTPUT_DIR = path.resolve(options.output);

    const SUPPORTED = [".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"];

    // ========================================
    // HEADER
    // ========================================

    console.log("");

    console.log("========================================");

    console.log(" TeknoLikha Resize + ICC Converter");

    console.log("========================================");

    console.log("");

    // ========================================
    // CHECK MAGICK
    // ========================================

    function checkMagick() {
      return new Promise((resolve) => {
        execFile("magick", ["-version"], (error, stdout) => {
          if (error) {
            console.error("❌ ImageMagick was not found.");

            resolve(false);

            return;
          }

          console.log("ImageMagick:", stdout.split("\n")[0].trim());

          resolve(true);
        });
      });
    }

    if (!(await checkMagick())) {
      return;
    }

    // ========================================
    // HEIGHT
    // ========================================

    const height = Number(options.height);

    if (!Number.isFinite(height) || height <= 0) {
      console.error("");

      console.error("❌ Height must be greater than 0.");

      console.error("");

      console.log("Example:");

      console.log("  teknolikha resize --height 36");

      console.log("");

      return;
    }

    // ========================================
    // QUALITY
    // ========================================

    const quality = Number(options.quality);

    if (!Number.isInteger(quality) || quality < 0 || quality > 100) {
      console.error("");

      console.error("❌ JPEG quality must be between 0 and 100.");

      console.error("");

      return;
    }

    // ========================================
    // FIND DEFAULT ICC
    // ========================================

    function findICCProfile(name) {
      if (!fs.existsSync(PROFILE_DIR)) {
        return null;
      }

      const files = fs.readdirSync(PROFILE_DIR);

      const found = files.find((file) => {
        const parsed = path.parse(file);

        return (
          parsed.name.toLowerCase() === name.toLowerCase() &&
          (parsed.ext.toLowerCase() === ".icc" ||
            parsed.ext.toLowerCase() === ".icm")
        );
      });

      if (!found) {
        return null;
      }

      return path.join(PROFILE_DIR, found);
    }

    const destinationProfile = findICCProfile(DEFAULT_ICC);

    if (!destinationProfile) {
      console.error("");

      console.error(`❌ Default ICC profile "${DEFAULT_ICC}" was not found.`);

      console.error("");

      console.error("Expected:");

      console.error("  profiles/3PASS TARP.icm");

      console.error("");

      return;
    }

    // ========================================
    // FIND sRGB PROFILE
    // ========================================

    function findSRGBProfile() {
      const candidates = [
        "sRGB.icc",
        "sRGB.icm",
        "sRGB Color Space Profile.icc",
        "sRGB Color Space Profile.icm",
      ];

      for (const filename of candidates) {
        const file = path.join(PROFILE_DIR, filename);

        if (fs.existsSync(file)) {
          return file;
        }
      }

      return null;
    }

    const sRGBProfile = findSRGBProfile();

    // ========================================
    // CREATE OUTPUT
    // ========================================

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, {
        recursive: true,
      });
    }

    // ========================================
    // FIND IMAGES
    // ========================================

    let files = [];

    if (image) {
      const fullPath = path.resolve(image);

      if (!fs.existsSync(fullPath)) {
        console.error("");

        console.error(`❌ Image not found: ${image}`);

        console.error("");

        return;
      }

      const ext = path.extname(fullPath).toLowerCase();

      if (!SUPPORTED.includes(ext)) {
        console.error("");

        console.error(`❌ Unsupported image format: ${ext}`);

        console.error("");

        return;
      }

      files.push(fullPath);
    } else {
      function scanDirectory(directory) {
        const entries = fs.readdirSync(directory, {
          withFileTypes: true,
        });

        for (const entry of entries) {
          const fullPath = path.join(directory, entry.name);

          if (entry.isDirectory()) {
            // Don't process output
            // directory again

            if (path.resolve(fullPath) === OUTPUT_DIR) {
              continue;
            }

            if (options.recursive) {
              scanDirectory(fullPath);
            }

            continue;
          }

          const ext = path.extname(entry.name).toLowerCase();

          if (SUPPORTED.includes(ext)) {
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
      console.log("");

      console.log("⚠ No supported images found.");

      console.log("");

      return;
    }

    // ========================================
    // INFORMATION
    // ========================================

    console.log("Target height :", `${height} inches`);

    console.log("Default ICC   :", path.basename(destinationProfile));

    console.log("Output        :", OUTPUT_DIR);

    console.log("JPEG quality  :", quality);

    console.log("Images        :", files.length);

    console.log("Recursive     :", options.recursive ? "Yes" : "No");

    console.log("");

    // ========================================
    // PROCESS IMAGE
    // ========================================

    function processImage(inputFile) {
      return new Promise((resolve) => {
        const relative = path.relative(process.cwd(), inputFile);

        const parsed = path.parse(relative);

        const outputDirectory = path.join(OUTPUT_DIR, parsed.dir);

        if (!fs.existsSync(outputDirectory)) {
          fs.mkdirSync(outputDirectory, {
            recursive: true,
          });
        }

        const outputFile = path.join(outputDirectory, `${parsed.name}.jpg`);

        console.log(`Processing: ${relative}`);

        // ========================================
        // CHECK SOURCE ICC
        // ========================================

        execFile(
          "magick",

          ["identify", "-format", "%[profile:icc]", inputFile],

          (profileError, profileOutput) => {
            const hasProfile =
              !profileError && profileOutput && profileOutput.trim().length > 0;

            if (hasProfile) {
              console.log("  Source ICC : Embedded");
            } else {
              console.log("  Source ICC : None");

              console.log("  Source     : sRGB");
            }

            console.log("  Resize     :", `${height} inches`);

            console.log("  ICC        :", path.basename(destinationProfile));

            // ========================================
            // BUILD COMMAND
            // ========================================

            const args = [inputFile];

            /*
             * If no ICC is embedded,
             * assign sRGB first.
             */

            if (!hasProfile) {
              if (!sRGBProfile) {
                console.error("");

                console.error("  ❌ sRGB.icc not found.");

                console.error("  Please add sRGB.icc to:");

                console.error(`  ${PROFILE_DIR}`);

                console.error("");

                resolve(false);

                return;
              }

              args.push("-profile", sRGBProfile);
            }

            // ========================================
            // CONVERT TO DEFAULT ICC
            // ========================================

            args.push("-profile", destinationProfile);

            // ========================================
            // RESIZE
            // ========================================

            /*
             * 300 DPI is used so that:
             *
             * 36 inches × 300 DPI
             * = 10800 pixels
             *
             * ImageMagick maintains the
             * original aspect ratio.
             */

            args.push("-units", "PixelsPerInch");

            args.push("-resize", `x${height * 300}`);

            args.push("-density", "300");

            // ========================================
            // JPEG
            // ========================================

            args.push("-quality", String(quality));

            args.push(outputFile);

            // ========================================
            // EXECUTE
            // ========================================

            execFile(
              "magick",
              args,

              (error, stdout, stderr) => {
                if (error) {
                  console.error("  ❌ Failed");

                  console.error("  ", stderr || error.message);

                  console.log("");

                  resolve(false);

                  return;
                }

                // ========================================
                // VERIFY
                // ========================================

                execFile(
                  "magick",

                  ["identify", "-format", "%wx%h", outputFile],

                  (verifyError, dimensions) => {
                    if (!verifyError) {
                      console.log("  Size       :", dimensions.trim());
                    }

                    console.log("  ✓ JPEG created");

                    console.log("  ✓ ICC converted");

                    console.log("  →", outputFile);

                    console.log("");

                    resolve(true);
                  },
                );
              },
            );
          },
        );
      });
    }

    // ========================================
    // PROCESS ALL
    // ========================================

    let converted = 0;
    let failed = 0;

    for (const file of files) {
      const success = await processImage(file);

      if (success) {
        converted++;
      } else {
        failed++;
      }
    }

    // ========================================
    // SUMMARY
    // ========================================

    console.log("========================================");

    console.log(" Resize + ICC Complete");

    console.log("========================================");

    console.log("Processed :", files.length);

    console.log("Success   :", converted);

    console.log("Failed    :", failed);

    console.log("Height    :", `${height} inches`);

    console.log("ICC       :", path.basename(destinationProfile));

    console.log("Output    :", OUTPUT_DIR);

    console.log("========================================");

    console.log("");
  });

  program.addCommand(command);
};
