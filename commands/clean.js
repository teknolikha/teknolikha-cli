const fs = require("fs");
const path = require("path");

module.exports = function (program) {
  program
    .command("clean")
    .description(
      "Force delete files by extension from the current directory and subdirectories",
    )

    .requiredOption(
      "-f, --format <extension>",
      "File extension to delete (example: png, jpg, jpeg)",
    )

    .option("-y, --yes", "Skip confirmation")

    .action((options) => {
      // ========================================
      // CLEAN EXTENSION
      // ========================================

      let extension = options.format.trim().toLowerCase();

      // Remove "." if user entered ".png"
      extension = extension.replace(/^\./, "");

      if (!extension) {
        console.error("");
        console.error("❌ File extension is required.");

        console.error("");

        console.log("Example:");

        console.log("  teknolikha clean -f png");

        console.log("");

        return;
      }

      // ========================================
      // CURRENT DIRECTORY
      // ========================================

      const rootDirectory = process.cwd();

      // ========================================
      // HEADER
      // ========================================

      console.log("");

      console.log("========================================");

      console.log(" TeknoLikha Clean");

      console.log("========================================");

      console.log("");

      console.log("Directory :", rootDirectory);

      console.log("Extension :", `.${extension}`);

      console.log("Recursive : Yes");

      console.log("");

      // ========================================
      // FIND FILES
      // ========================================

      const files = [];

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

          // DIRECTORY
          if (entry.isDirectory()) {
            scanDirectory(fullPath);

            continue;
          }

          // FILE
          if (entry.isFile()) {
            const fileExtension = path
              .extname(entry.name)
              .toLowerCase()
              .replace(/^\./, "");

            if (fileExtension === extension) {
              files.push(fullPath);
            }
          }
        }
      }

      scanDirectory(rootDirectory);

      // ========================================
      // NO FILES
      // ========================================

      if (files.length === 0) {
        console.log(`No .${extension} files found.`);

        console.log("");

        return;
      }

      // ========================================
      // SHOW FILES
      // ========================================

      console.log(`Found ${files.length} file(s):`);

      console.log("");

      files.forEach((file, index) => {
        console.log(`${index + 1}.`, path.relative(rootDirectory, file));
      });

      console.log("");

      // ========================================
      // CONFIRMATION
      // ========================================

      if (!options.yes) {
        console.log("⚠ WARNING: These files will be PERMANENTLY DELETED.");

        console.log("");

        console.log("To confirm deletion, run:");

        console.log("");

        console.log(`  teknolikha clean -f ${extension} --yes`);

        console.log("");

        return;
      }

      // ========================================
      // DELETE FILES
      // ========================================

      console.log("Deleting files...");

      console.log("");

      let deleted = 0;
      let failed = 0;

      for (const file of files) {
        try {
          fs.rmSync(file, {
            force: true,
          });

          console.log("✓ Deleted:", path.relative(rootDirectory, file));

          deleted++;
        } catch (error) {
          console.error("❌ Failed:", path.relative(rootDirectory, file));

          console.error("  ", error.message);

          failed++;
        }
      }

      // ========================================
      // SUMMARY
      // ========================================

      console.log("");

      console.log("========================================");

      console.log(" Clean Complete");

      console.log("========================================");

      console.log("Found   :", files.length);

      console.log("Deleted :", deleted);

      console.log("Failed  :", failed);

      console.log("========================================");

      console.log("");
    });
};
