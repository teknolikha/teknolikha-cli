const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { Command } = require("commander");

module.exports = function (program) {

    const resize = new Command("imageresize");

    resize
        .description(
            "Resize images proportionally using physical dimensions"
        )

        .argument(
            "[image]",
            "Image file to resize. If omitted, process images in current directory."
        )

        .option(
            "--height <inches>",
            "Target height in inches"
        )

        .option(
            "--width <inches>",
            "Target width in inches"
        )

        .option(
            "--dpi <number>",
            "Output resolution in DPI",
            "150"
        )

        .option(
            "-o, --output <folder>",
            "Output folder",
            "resized"
        )

        .option(
            "-q, --quality <0-100>",
            "JPEG quality",
            "100"
        )

        .option(
            "-r, --recursive",
            "Process subfolders"
        );


    resize.action((image, options) => {

        // ========================================
        // VALIDATE HEIGHT / WIDTH
        // ========================================

        const hasHeight =
            options.height !== undefined;

        const hasWidth =
            options.width !== undefined;


        if (!hasHeight && !hasWidth) {

            console.error(
                "❌ Specify either --height or --width."
            );

            console.log("");
            console.log("Examples:");
            console.log(
                "  teknolikha imageresize image.png --height 20"
            );
            console.log(
                "  teknolikha imageresize --height 20"
            );

            process.exit(1);
        }


        if (hasHeight && hasWidth) {

            console.error(
                "❌ Use either --height OR --width, not both."
            );

            process.exit(1);
        }


        // ========================================
        // NUMBERS
        // ========================================

        const targetHeight =
            hasHeight
                ? Number(options.height)
                : null;

        const targetWidth =
            hasWidth
                ? Number(options.width)
                : null;

        const dpi =
            Number(options.dpi);

        const quality =
            Number(options.quality);


        if (
            (hasHeight &&
                (!isFinite(targetHeight) ||
                    targetHeight <= 0)) ||

            (hasWidth &&
                (!isFinite(targetWidth) ||
                    targetWidth <= 0))
        ) {

            console.error(
                "❌ Height/width must be a positive number."
            );

            process.exit(1);
        }


        if (
            !Number.isInteger(dpi) ||
            dpi <= 0
        ) {

            console.error(
                "❌ DPI must be a positive integer."
            );

            process.exit(1);
        }


        if (
            !Number.isInteger(quality) ||
            quality < 0 ||
            quality > 100
        ) {

            console.error(
                "❌ JPEG quality must be between 0 and 100."
            );

            process.exit(1);
        }


        // ========================================
        // SUPPORTED IMAGE TYPES
        // ========================================

        const SUPPORTED = [
            ".png",
            ".jpg",
            ".jpeg",
            ".bmp",
            ".tif",
            ".tiff"
        ];


        // ========================================
        // GET IMAGE LIST
        // ========================================

        let files = [];


        // ========================================
        // SINGLE IMAGE MODE
        // ========================================

        if (image) {

            if (!fs.existsSync(image)) {

                console.error(
                    `❌ Image not found: ${image}`
                );

                process.exit(1);
            }


            const ext =
                path.extname(image).toLowerCase();


            if (!SUPPORTED.includes(ext)) {

                console.error(
                    `❌ Unsupported image format: ${ext}`
                );

                process.exit(1);
            }


            files.push(image);

        }


        // ========================================
        // DIRECTORY MODE
        // ========================================

        else {

            function scan(dir) {

                const entries =
                    fs.readdirSync(
                        dir,
                        { withFileTypes: true }
                    );


                for (const entry of entries) {

                    const fullPath =
                        path.join(
                            dir,
                            entry.name
                        );


                    // ------------------------------
                    // DIRECTORY
                    // ------------------------------

                    if (entry.isDirectory()) {

                        // Don't scan output directory
                        if (
                            path.resolve(fullPath) ===
                            path.resolve(options.output)
                        ) {
                            continue;
                        }


                        if (options.recursive) {
                            scan(fullPath);
                        }

                    }


                    // ------------------------------
                    // FILE
                    // ------------------------------

                    else {

                        const ext =
                            path
                                .extname(entry.name)
                                .toLowerCase();


                        if (
                            SUPPORTED.includes(ext)
                        ) {

                            files.push(fullPath);

                        }
                    }
                }
            }


            scan(".");
        }


        // ========================================
        // NO FILES
        // ========================================

        if (files.length === 0) {

            console.log("");

            console.log(
                "❌ No supported images found."
            );

            console.log("");

            process.exit(0);
        }


        // ========================================
        // DISPLAY MODE
        // ========================================

        console.log("");

        console.log(
            "========================================"
        );

        console.log(
            " TeknoLikha Image Resize"
        );

        console.log(
            "========================================"
        );


        if (image) {

            console.log(
                "Mode       : Single Image"
            );

        } else {

            console.log(
                "Mode       : Current Directory"
            );

            console.log(
                "Recursive  :",
                options.recursive
                    ? "Yes"
                    : "No"
            );
        }


        console.log(
            "Target     :",
            hasHeight
                ? `${targetHeight} inches height`
                : `${targetWidth} inches width`
        );

        console.log(
            "Resolution :",
            `${dpi} DPI`
        );

        console.log(
            "Images     :",
            files.length
        );

        console.log("");


        // ========================================
        // PROCESS IMAGES
        // ========================================

        let completed = 0;
        let success = 0;
        let failed = 0;

        const startTime =
            Date.now();


        files.forEach((file) => {

            // ====================================
            // READ IMAGE INFORMATION
            // ====================================

            execFile(
                "magick",

                [
                    "identify",

                    "-format",
                    "%w %h %[resolution.x] %[resolution.y]",

                    file
                ],

                (err, stdout, stderr) => {

                    if (err) {

                        failed++;
                        completed++;

                        console.log(
                            `❌ [${completed}/${files.length}] ${file}`
                        );

                        if (
                            completed ===
                            files.length
                        ) {
                            finish();
                        }

                        return;
                    }


                    const values =
                        stdout.trim().split(/\s+/);


                    const pixelWidth =
                        Number(values[0]);

                    const pixelHeight =
                        Number(values[1]);


                    let originalDpiX =
                        Number(values[2]);

                    let originalDpiY =
                        Number(values[3]);


                    // ====================================
                    // DEFAULT DPI
                    // ====================================

                    if (
                        !isFinite(originalDpiX) ||
                        originalDpiX <= 0
                    ) {

                        originalDpiX = dpi;

                    }


                    if (
                        !isFinite(originalDpiY) ||
                        originalDpiY <= 0
                    ) {

                        originalDpiY = dpi;

                    }


                    // ====================================
                    // ORIGINAL SIZE
                    // ====================================

                    const originalWidthInches =
                        pixelWidth /
                        originalDpiX;


                    const originalHeightInches =
                        pixelHeight /
                        originalDpiY;


                    // ====================================
                    // NEW SIZE
                    // ====================================

                    let newWidthInches;
                    let newHeightInches;


                    if (hasHeight) {

                        newHeightInches =
                            targetHeight;

                        newWidthInches =
                            originalWidthInches *
                            (
                                targetHeight /
                                originalHeightInches
                            );

                    } else {

                        newWidthInches =
                            targetWidth;

                        newHeightInches =
                            originalHeightInches *
                            (
                                targetWidth /
                                originalWidthInches
                            );
                    }


                    // ====================================
                    // NEW PIXELS
                    // ====================================

                    const newPixelWidth =
                        Math.round(
                            newWidthInches *
                            dpi
                        );


                    const newPixelHeight =
                        Math.round(
                            newHeightInches *
                            dpi
                        );


                    // ====================================
                    // OUTPUT FILE
                    // ====================================

                    let outputFile;


                    if (image) {

                        // Single image
                        // Use specified output
                        // or automatic filename

                        if (
                            options.output !== "resized"
                        ) {

                            outputFile =
                                options.output;

                        } else {

                            const parsed =
                                path.parse(file);

                            outputFile =
                                path.join(
                                    parsed.dir,
                                    `${parsed.name}_resized${parsed.ext}`
                                );
                        }

                    } else {

                        // Batch mode

                        const relative =
                            path.relative(
                                ".",
                                file
                            );


                        outputFile =
                            path.join(
                                options.output,
                                path.dirname(relative),
                                `${path.parse(relative).name}_resized${path.parse(relative).ext}`
                            );
                    }


                    // ====================================
                    // CREATE OUTPUT DIRECTORY
                    // ====================================

                    fs.mkdirSync(
                        path.dirname(outputFile),
                        {
                            recursive: true
                        }
                    );


                    // ====================================
                    // RESIZE
                    // ====================================

                    execFile(
                        "magick",

                        [
                            file,

                            "-resize",
                            `${newPixelWidth}x${newPixelHeight}!`,

                            "-units",
                            "PixelsPerInch",

                            "-density",
                            `${dpi}x${dpi}`,

                            "-quality",
                            String(quality),

                            outputFile
                        ],

                        (resizeErr, resizeStdout, resizeStderr) => {

                            completed++;


                            if (resizeErr) {

                                failed++;

                                console.log(
                                    `❌ [${completed}/${files.length}] ${file}`
                                );

                            } else {

                                success++;

                                console.log(
                                    `✅ [${completed}/${files.length}] ${file}`
                                );

                            }


                            // ====================================
                            // FINISHED
                            // ====================================

                            if (
                                completed ===
                                files.length
                            ) {

                                finish();

                            }

                        }
                    );

                }

            );

        });


        // ========================================
        // FINISH
        // ========================================

        function finish() {

            const seconds =
                (
                    (
                        Date.now() -
                        startTime
                    ) / 1000
                ).toFixed(2);


            console.log("");

            console.log(
                "========================================"
            );

            console.log(
                " Resize Complete"
            );

            console.log(
                "========================================"
            );

            console.log(
                "Images Found :",
                files.length
            );

            console.log(
                "Resized      :",
                success
            );

            console.log(
                "Failed       :",
                failed
            );

            console.log(
                "Time         :",
                seconds + " sec"
            );

            console.log(
                "Output       :",
                options.output
            );

            console.log(
                "========================================"
            );

            console.log("");
        }

    });


    program.addCommand(resize);

};