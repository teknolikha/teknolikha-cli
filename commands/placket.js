const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");
const { Command } = require("commander");

module.exports = function (program) {
  const command = new Command("placket");

  command
    .description(
      "Create 8x3.5 inch landscape placket images with HEX color and convert to the default ICC profile",
    )
    .requiredOption("--project <name>", "Project name")
    .requiredOption("--hex <color>", "HEX color code (example: #FF0000)")
    .option("--copy <number>", "Number of copies to create", "1")
    .option(
      "-o, --output <folder>",
      "Output folder. Default: Desktop/plackets/[PROJECT]/[HEX]",
    )
    .option("-q, --quality <0-100>", "JPEG quality", "100");

  const WIDTH_INCHES = 8;
  const HEIGHT_INCHES = 3.5;
  const DPI = 150;
  const DEFAULT_ICC = "3PASS ICT";

  const PROFILE_DIR = path.join(__dirname, "..", "profiles");

  // ============================================================
  // DEFAULT OUTPUT DIRECTORY
  // Desktop/plackets/[PROJECT]/[HEX]
  // ============================================================

  function getDefaultOutputDirectory(project, hex) {
    return path.join(os.homedir(), "Desktop", "plackets", project, hex);
  }

  // ============================================================
  // FIND ICC PROFILE
  // ============================================================

  function findICCProfile(name) {
    if (!fs.existsSync(PROFILE_DIR)) {
      return null;
    }

    const cleanName = name.replace(/\.icc$/i, "").replace(/\.icm$/i, "");

    const files = fs.readdirSync(PROFILE_DIR);

    const found = files.find((file) => {
      const parsed = path.parse(file);

      return (
        parsed.name.toLowerCase() === cleanName.toLowerCase() &&
        (parsed.ext.toLowerCase() === ".icc" ||
          parsed.ext.toLowerCase() === ".icm")
      );
    });

    if (!found) {
      return null;
    }

    return path.join(PROFILE_DIR, found);
  }

  // ============================================================
  // FIND sRGB PROFILE
  // ============================================================

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

  // ============================================================
  // SAFE PROJECT NAME
  // ============================================================

  function sanitizeProjectName(project) {
    return project
      .trim()
      .replace(/[<>:"/\\|?*]/g, "_")
      .replace(/\s+/g, " ");
  }

  // ============================================================
  // UNIQUE OUTPUT NAME
  // ============================================================

  function getUniqueOutputPath(directory, baseName) {
    let outputPath = path.join(directory, `${baseName}.jpg`);

    if (!fs.existsSync(outputPath)) {
      return outputPath;
    }

    let version = 1;

    while (true) {
      outputPath = path.join(directory, `${baseName}_v${version}.jpg`);

      if (!fs.existsSync(outputPath)) {
        return outputPath;
      }

      version++;
    }
  }

  // ============================================================
  // COMMAND ACTION
  // ============================================================

  command.action(async (options) => {
    console.log("");
    console.log("========================================");
    console.log(" TeknoLikha Placket Generator");
    console.log("========================================");
    console.log("");

    // ----------------------------------------------------
    // PROJECT
    // ----------------------------------------------------

    let project = sanitizeProjectName(options.project);

    if (!project) {
      console.error("");
      console.error("❌ Project name cannot be empty.");
      console.error("");

      return;
    }

    // ----------------------------------------------------
    // HEX
    // ----------------------------------------------------

    let hex = options.hex.trim();

    hex = hex.replace(/^#/, "");

    hex = hex.toUpperCase();

    if (!/^[0-9A-F]{6}$/.test(hex)) {
      console.error("");
      console.error("❌ Invalid HEX color.");
      console.error("");

      console.error("HEX must contain exactly 6 hexadecimal characters.");

      console.error("");

      console.error(
        'Example: teknolikha placket --project "Project Alpha" --hex "#FF0000"',
      );

      console.error("");

      return;
    }

    // ----------------------------------------------------
    // COPY
    // ----------------------------------------------------

    const copy = Number(options.copy);

    if (!Number.isInteger(copy) || copy < 1) {
      console.error("");
      console.error("❌ Copy must be a whole number greater than 0.");
      console.error("");

      console.error(
        'Example: teknolikha placket --project "Project Alpha" --hex "#000000" --copy 5',
      );

      console.error("");

      return;
    }

    // ----------------------------------------------------
    // QUALITY
    // ----------------------------------------------------

    const quality = Number(options.quality);

    if (!Number.isInteger(quality) || quality < 0 || quality > 100) {
      console.error("");
      console.error("❌ JPEG quality must be between 0 and 100.");
      console.error("");

      return;
    }

    // ----------------------------------------------------
    // OUTPUT DIRECTORY
    // ----------------------------------------------------

    const OUTPUT_DIR = options.output
      ? path.resolve(options.output)
      : getDefaultOutputDirectory(project, hex);

    // ----------------------------------------------------
    // DESTINATION ICC
    // ----------------------------------------------------

    const destinationProfile = findICCProfile(DEFAULT_ICC);

    if (!destinationProfile) {
      console.error("");
      console.error(`❌ Default ICC profile "${DEFAULT_ICC}" was not found.`);

      console.error("");

      console.error("Expected profile:");

      console.error("  profiles/3PASS ICT.icm");

      console.error("");

      console.error("Use:");

      console.error("  teknolikha iccconvert --list-icc");

      console.error("");

      return;
    }

    // ----------------------------------------------------
    // SOURCE sRGB PROFILE
    // ----------------------------------------------------

    const sRGBProfile = findSRGBProfile();

    if (!sRGBProfile) {
      console.error("");
      console.error("❌ sRGB ICC profile was not found.");

      console.error("");

      console.error("Please place sRGB.icc inside:");

      console.error(PROFILE_DIR);

      console.error("");

      return;
    }

    // ----------------------------------------------------
    // PIXEL DIMENSIONS
    // ----------------------------------------------------

    const widthPixels = Math.round(WIDTH_INCHES * DPI);

    const heightPixels = Math.round(HEIGHT_INCHES * DPI);

    // ----------------------------------------------------
    // CREATE OUTPUT DIRECTORY
    // ----------------------------------------------------

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, {
        recursive: true,
      });
    }

    // ----------------------------------------------------
    // INFORMATION
    // ----------------------------------------------------

    console.log("Project       :", project);

    console.log("Size          :", `${WIDTH_INCHES} × ${HEIGHT_INCHES} inches`);

    console.log("Orientation   :", "Landscape");

    console.log("Resolution    :", `${widthPixels} × ${heightPixels} pixels`);

    console.log("DPI           :", DPI);

    console.log("HEX Color     :", `#${hex}`);

    console.log("Copies        :", copy);

    console.log("Source ICC    :", path.basename(sRGBProfile));

    console.log("Destination ICC:", path.basename(destinationProfile));

    console.log("Output        :", OUTPUT_DIR);

    console.log("");

    // ----------------------------------------------------
    // CHECK IMAGEMAGICK
    // ----------------------------------------------------

    const magickAvailable = await new Promise((resolve) => {
      execFile("magick", ["-version"], (error, stdout) => {
        if (error) {
          console.error("❌ ImageMagick was not found.");

          console.error("");

          console.error(
            "Make sure ImageMagick is installed and available in PATH.",
          );

          console.error("");

          resolve(false);

          return;
        }

        console.log("ImageMagick:", stdout.split("\n")[0].trim());

        console.log("");

        resolve(true);
      });
    });

    if (!magickAvailable) {
      return;
    }

    // ----------------------------------------------------
    // CREATE FILES
    // ----------------------------------------------------

    let created = 0;
    let failed = 0;

    for (let i = 1; i <= copy; i++) {
      const baseName = `placket_8x3.5_${hex}`;

      const outputFile = getUniqueOutputPath(OUTPUT_DIR, baseName);

      console.log(`Creating copy ${i} of ${copy}...`);

      // ------------------------------------------------
      // IMAGEMAGICK
      //
      // 1. Create solid HEX image
      // 2. Set 150 DPI
      // 3. Assign sRGB
      // 4. Convert to 3PASS ICT
      // 5. Embed destination ICC
      // ------------------------------------------------

      const args = [
        "-size",
        `${widthPixels}x${heightPixels}`,

        `xc:#${hex}`,

        "-units",
        "PixelsPerInch",

        "-density",
        String(DPI),

        "-profile",
        sRGBProfile,

        "-profile",
        destinationProfile,

        "-quality",
        String(quality),

        outputFile,
      ];

      const result = await new Promise((resolve) => {
        execFile("magick", args, (error, stdout, stderr) => {
          if (error) {
            console.error("  ❌ Failed");

            console.error("  ", stderr || error.message);

            console.log("");

            resolve(false);

            return;
          }

          resolve(true);
        });
      });

      if (!result) {
        failed++;

        continue;
      }

      // ------------------------------------------------
      // VERIFY DIMENSIONS
      // ------------------------------------------------

      const verified = await new Promise((resolve) => {
        execFile(
          "magick",
          ["identify", "-format", "%wx%h", outputFile],
          (error, dimensions) => {
            if (error) {
              resolve(false);

              return;
            }

            console.log("  ✓ Created:", path.basename(outputFile));

            console.log("  ✓ Size:", dimensions.trim());

            console.log("  ✓ ICC:", path.basename(destinationProfile));

            console.log("");

            resolve(true);
          },
        );
      });

      if (verified) {
        created++;
      } else {
        failed++;
      }
    }

    // ----------------------------------------------------
    // COMPLETE
    // ----------------------------------------------------

    console.log("========================================");

    console.log(" Placket Complete");

    console.log("========================================");

    console.log("Project   :", project);

    console.log("Size      :", `${WIDTH_INCHES} × ${HEIGHT_INCHES} inches`);

    console.log("Color     :", `#${hex}`);

    console.log("Copies    :", copy);

    console.log("Created   :", created);

    console.log("Failed    :", failed);

    console.log("ICC       :", path.basename(destinationProfile));

    console.log("Output    :", OUTPUT_DIR);

    console.log("========================================");

    console.log("");
  });

  program.addCommand(command);
};
