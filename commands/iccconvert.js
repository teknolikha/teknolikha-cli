const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { Command } = require("commander");

module.exports = function (program) {

    const command = new Command("iccconvert");

    command
        .description("Convert images using an ICC profile and export as JPEG")

        .argument(
            "[image]",
            "Image to convert. If omitted, all images in the current directory are processed."
        )

        .option(
            "-i, --icc <name>",
            "ICC profile name (default: 3PASS TARP)"
        )

        .option(
            "-o, --output <folder>",
            "Output folder",
            "converted"
        )

        .option(
            "-q, --quality <0-100>",
            "JPEG quality",
            "100"
        )

        .option(
            "-r, --recursive",
            "Process subfolders"
        )

        .option(
            "--list-icc",
            "Display available ICC/ICM profiles"
        );

    command.action(async (image, options) => {

        // ========================================
        // DIRECTORIES
        // ========================================

        const PROFILE_DIR = path.join(
            __dirname,
            "..",
            "profiles"
        );

        const OUTPUT_DIR = path.resolve(
            options.output
        );


        // ========================================
        // SUPPORTED FILES
        // ========================================

        const IMAGE_EXTENSIONS = [
            ".png",
            ".jpg",
            ".jpeg",
            ".bmp",
            ".tif",
            ".tiff"
        ];


        // ========================================
        // HEADER
        // ========================================

        console.log("");

        console.log("========================================");
        console.log(" TeknoLikha ICC Converter");
        console.log("========================================");


        // ========================================
        // CHECK MAGICK
        // ========================================

        function checkMagick() {

            return new Promise(resolve => {

                execFile(
                    "magick",
                    ["-version"],
                    (error, stdout) => {

                        if (error) {

                            console.error("");
                            console.error(
                                "❌ ImageMagick was not found."
                            );

                            console.error("");
                            console.error(
                                "Please make sure ImageMagick is installed"
                            );

                            console.error(
                                "and the 'magick' command is available."
                            );

                            console.error("");

                            resolve(false);

                            return;
                        }

                        const firstLine =
                            stdout
                                .split("\n")[0]
                                .trim();

                        console.log("");
                        console.log(
                            "ImageMagick :",
                            firstLine
                        );

                        resolve(true);
                    }
                );
            });
        }


        if (!await checkMagick()) {
            return;
        }


        // ========================================
        // LIST ICC PROFILES
        // ========================================

        if (options.listIcc) {

            console.log("");
            console.log(
                "ICC Profile Directory:"
            );

            console.log(
                PROFILE_DIR
            );

            console.log("");

            if (!fs.existsSync(PROFILE_DIR)) {

                console.error(
                    "❌ Profiles directory does not exist."
                );

                return;
            }


            const profiles =
                fs.readdirSync(PROFILE_DIR)
                    .filter(file => {

                        const ext =
                            path.extname(file)
                                .toLowerCase();

                        return (
                            ext === ".icc" ||
                            ext === ".icm"
                        );
                    })
                    .sort();


            if (profiles.length === 0) {

                console.log(
                    "No ICC/ICM profiles found."
                );

                return;
            }


            profiles.forEach(
                (profile, index) => {

                    console.log(
                        `${index + 1}. ${profile}`
                    );

                }
            );


            console.log("");
            console.log(
                `Total: ${profiles.length} profile(s)`
            );

            console.log("");

            return;
        }


        // ========================================
        // CHECK ICC PROFILE
        // ========================================

        // if (!options.icc) {

        //     console.error("");
        //     console.error(
        //         "❌ ICC profile is required."
        //     );

        //     console.log("");
        //     console.log(
        //         "Available profiles:"
        //     );

        //     console.log(
        //         "  teknolikha iccconvert --list-icc"
        //     );

        //     console.log("");

        //     console.log(
        //         "Example:"
        //     );

        //     console.log(
        //         '  teknolikha iccconvert -i "3PASS TARP"'
        //     );

        //     console.log("");

        //     return;
        // }


        // ========================================
        // FIND ICC PROFILE
        // ========================================

        function findICCProfile(name) {

            const cleanName =
                name
                    .replace(/\.icc$/i, "")
                    .replace(/\.icm$/i, "");


            const files =
                fs.readdirSync(
                    PROFILE_DIR
                );


            const found =
                files.find(file => {

                    const parsed =
                        path.parse(file);

                    return (
                        parsed.name.toLowerCase() ===
                        cleanName.toLowerCase()
                    )
                    &&
                    (
                        parsed.ext.toLowerCase() === ".icc" ||
                        parsed.ext.toLowerCase() === ".icm"
                    );
                });


            if (!found) {
                return null;
            }


            return path.join(
                PROFILE_DIR,
                found
            );
        }


        if (!fs.existsSync(PROFILE_DIR)) {

            console.error("");
            console.error(
                "❌ Profiles directory does not exist:"
            );

            console.error(
                PROFILE_DIR
            );

            console.error("");

            return;
        }


        // const destinationProfile =
        //     findICCProfile(
        //         options.icc
        //     );

        const profileName =
            options.icc || "3PASS TARP";

        const destinationProfile =
            findICCProfile(
                profileName
            );


        if (!destinationProfile) {

            console.error("");
            console.error(
                `❌ ICC profile not found: ${profileName}`
            );

            console.log("");

            console.log(
                "Run:"
            );

            console.log(
                "  teknolikha iccconvert --list-icc"
            );

            console.log("");

            return;
        }


        // ========================================
        // FIND sRGB PROFILE
        // ========================================

        function findSRGBProfile() {

            const candidates = [
                "sRGB.icc",
                "sRGB.icm",
                "sRGB Color Space Profile.icm",
                "sRGB Color Space Profile.icc"
            ];


            for (const filename of candidates) {

                const file =
                    path.join(
                        PROFILE_DIR,
                        filename
                    );


                if (fs.existsSync(file)) {
                    return file;
                }
            }


            return null;
        }


        const sRGBProfile =
            findSRGBProfile();


        // ========================================
        // QUALITY
        // ========================================

        const quality =
            parseInt(
                options.quality,
                10
            );


        if (
            isNaN(quality) ||
            quality < 0 ||
            quality > 100
        ) {

            console.error("");
            console.error(
                "❌ Quality must be between 0 and 100."
            );

            console.error("");

            return;
        }


        // ========================================
        // CREATE OUTPUT DIRECTORY
        // ========================================

        if (!fs.existsSync(OUTPUT_DIR)) {

            fs.mkdirSync(
                OUTPUT_DIR,
                {
                    recursive: true
                }
            );
        }


        // ========================================
        // FIND IMAGES
        // ========================================

        let files = [];


        // ========================================
        // SINGLE IMAGE
        // ========================================

        if (image) {

            const fullPath =
                path.resolve(image);


            if (!fs.existsSync(fullPath)) {

                console.error("");
                console.error(
                    `❌ File not found: ${image}`
                );

                console.error("");

                return;
            }


            const ext =
                path.extname(fullPath)
                    .toLowerCase();


            if (
                !IMAGE_EXTENSIONS.includes(ext)
            ) {

                console.error("");
                console.error(
                    `❌ Unsupported image format: ${ext}`
                );

                console.error("");

                return;
            }


            files.push(fullPath);

        }


        // ========================================
        // ALL IMAGES
        // ========================================

        else {

            function scanDirectory(directory) {

                const entries =
                    fs.readdirSync(
                        directory,
                        {
                            withFileTypes: true
                        }
                    );


                for (
                    const entry
                    of entries
                ) {

                    const fullPath =
                        path.join(
                            directory,
                            entry.name
                        );


                    // DIRECTORY
                    if (entry.isDirectory()) {

                        // Don't scan output folder
                        if (
                            path.resolve(fullPath) ===
                            OUTPUT_DIR
                        ) {
                            continue;
                        }


                        if (options.recursive) {

                            scanDirectory(
                                fullPath
                            );

                        }

                        continue;
                    }


                    // FILE
                    const ext =
                        path.extname(
                            entry.name
                        )
                        .toLowerCase();


                    if (
                        IMAGE_EXTENSIONS.includes(ext)
                    ) {

                        files.push(
                            path.resolve(
                                fullPath
                            )
                        );

                    }
                }
            }


            scanDirectory(
                process.cwd()
            );
        }


        // ========================================
        // NO FILES
        // ========================================

        if (files.length === 0) {

            console.log("");
            console.log(
                "⚠ No supported images found."
            );

            console.log("");

            return;
        }


        // ========================================
        // INFORMATION
        // ========================================

        console.log("");

        console.log(
            "Source        :",
            image
                ? image
                : "Current directory"
        );

        console.log(
            "ICC Profile   :",
            path.basename(
                destinationProfile
            )
        );

        console.log(
            "Output        :",
            OUTPUT_DIR
        );

        console.log(
            "JPEG Quality  :",
            quality
        );

        console.log(
            "Images        :",
            files.length
        );

        console.log(
            "Recursive     :",
            options.recursive
                ? "Yes"
                : "No"
        );

        console.log("");


        // ========================================
        // PROCESS IMAGE
        // ========================================

        function convertImage(inputFile) {

            return new Promise(resolve => {

                const relativePath =
                    path.relative(
                        process.cwd(),
                        inputFile
                    );


                const parsed =
                    path.parse(
                        relativePath
                    );


                const outputDirectory =
                    path.join(
                        OUTPUT_DIR,
                        parsed.dir
                    );


                if (
                    !fs.existsSync(
                        outputDirectory
                    )
                ) {

                    fs.mkdirSync(
                        outputDirectory,
                        {
                            recursive: true
                        }
                    );
                }


                const outputFile =
                    path.join(
                        outputDirectory,
                        `${parsed.name}.jpg`
                    );


                // ========================================
                // IMAGE PROFILE CHECK
                // ========================================

                execFile(
                    "magick",

                    [
                        "identify",
                        "-format",
                        "%[profile:icc]",
                        inputFile
                    ],

                    (profileError, profileOutput) => {

                        const hasProfile =
                            !profileError &&
                            profileOutput &&
                            profileOutput.trim().length > 0;


                        console.log(
                            `Processing: ${relativePath}`
                        );


                        if (hasProfile) {

                            console.log(
                                "  Source ICC : Embedded"
                            );

                        } else {

                            console.log(
                                "  Source ICC : None"
                            );

                            console.log(
                                "  Source     : sRGB"
                            );
                        }


                        console.log(
                            "  Destination:",
                            path.basename(
                                destinationProfile
                            )
                        );


                        // ========================================
                        // BUILD MAGICK COMMAND
                        // ========================================

                        const args = [
                            inputFile
                        ];


                        /*
                         * IMPORTANT:
                         *
                         * If the source has no ICC profile,
                         * explicitly assign sRGB.
                         *
                         * If the source already has an ICC,
                         * ImageMagick uses that embedded
                         * profile as the source.
                         */

                        if (!hasProfile) {

                            if (!sRGBProfile) {

                                console.error(
                                    "  ❌ sRGB.icc not found in profiles folder."
                                );

                                console.error(
                                    "  Add an sRGB ICC profile to:"
                                );

                                console.error(
                                    `  ${PROFILE_DIR}`
                                );

                                resolve(false);

                                return;
                            }


                            args.push(
                                "-profile",
                                sRGBProfile
                            );
                        }


                        // Destination profile
                        args.push(
                            "-profile",
                            destinationProfile
                        );


                        // JPEG quality
                        args.push(
                            "-quality",
                            String(quality)
                        );


                        // Output
                        args.push(
                            outputFile
                        );


                        // ========================================
                        // EXECUTE
                        // ========================================

                        execFile(
                            "magick",
                            args,

                            (error, stdout, stderr) => {

                                if (error) {

                                    console.error(
                                        "  ❌ Conversion failed"
                                    );

                                    console.error(
                                        "  ",
                                        stderr ||
                                        error.message
                                    );

                                    resolve(false);

                                    return;
                                }


                                // ========================================
                                // VERIFY ICC
                                // ========================================

                                execFile(
                                    "magick",

                                    [
                                        "identify",
                                        "-format",
                                        "%[profile:icc]",
                                        outputFile
                                    ],

                                    (
                                        verifyError,
                                        verifyOutput
                                    ) => {

                                        if (
                                            verifyError ||
                                            !verifyOutput ||
                                            !verifyOutput.trim()
                                        ) {

                                            console.error(
                                                "  ⚠ Conversion completed but ICC profile was not detected."
                                            );

                                            resolve(false);

                                            return;
                                        }


                                        console.log(
                                            "  ✓ JPEG created"
                                        );

                                        console.log(
                                            "  ✓ ICC profile embedded"
                                        );

                                        console.log(
                                            "  →",
                                            outputFile
                                        );

                                        console.log("");

                                        resolve(true);
                                    }
                                );
                            }
                        );
                    }
                );
            });
        }


        // ========================================
        // PROCESS ALL
        // ========================================

        let converted = 0;
        let failed = 0;


        for (
            const file
            of files
        ) {

            const success =
                await convertImage(
                    file
                );


            if (success) {
                converted++;
            } else {
                failed++;
            }
        }


        // ========================================
        // SUMMARY
        // ========================================

        console.log(
            "========================================"
        );

        console.log(
            " Conversion Complete"
        );

        console.log(
            "========================================"
        );

        console.log(
            "Converted :",
            converted
        );

        console.log(
            "Failed    :",
            failed
        );

        console.log(
            "Output    :",
            OUTPUT_DIR
        );

        console.log(
            "========================================"
        );

        console.log("");

    });


    // ========================================
    // REGISTER COMMAND
    // ========================================

    program.addCommand(
        command
    );
};