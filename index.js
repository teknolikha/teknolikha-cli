#!/usr/bin/env node

const { Command } = require("commander");

const program = new Command();

program
  .name("teknolikha")
  .description("TeknoLikha Image Processing Toolkit")
  .version("1.0.0", "-v, --version", "Display version");

// ========================================
// IMAGE RESIZE
// ========================================

const resizeCommand = require("./commands/imageresize");

resizeCommand(program);

// ========================================
// ICC CONVERTER
// ========================================

const iccCommand = require("./commands/iccconvert");

iccCommand(program);

// ========================================
// PARSE
// ========================================

program.parse();
