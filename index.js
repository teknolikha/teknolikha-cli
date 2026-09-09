#!/usr/bin/env node

const { Command } = require("commander");

const program = new Command();

program
  .name("teknolikha")
  .description("TeknoLikha Image Processing Toolkit")
  .version("1.0.0", "-v, --version", "Display version");

// ========================================
// CLEAN
// ========================================

const cleanCommand = require("./commands/clean");

cleanCommand(program);

// ========================================
// RESIZE + ICC
// ========================================

const combinedResizeCommand = require("./commands/resize");

combinedResizeCommand(program);

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
// PLACKET
// ========================================

const placketCommand = require("./commands/placket");

placketCommand(program);

// COLLAR
const collarCommand = require("./commands/collar");
collarCommand(program);

// ========================================
// PARSE
// ========================================

program.parse();
