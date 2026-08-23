import { accessSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const COLUMNS = 3;
const ROWS = 4;
const CELL_WIDTH = 418;
const CELL_HEIGHT = 313;
const FRAME_PADDING = 10;
const ALIGNMENT_TOLERANCE = 3;

function fail(message) {
  process.stderr.write(`map-character-sheet: ${message}\n`);
  process.exitCode = 1;
}

function runMagick(args) {
  const result = spawnSync("magick", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((result.stderr || result.stdout).trim() || `magick ${args.join(" ")} が失敗しました`);
  return `${result.stdout}${result.stderr}`;
}

function imageSize(path) {
  const output = runMagick(["identify", "-format", "%w %h", path]).trim();
  const [width, height] = output.split(/\s+/).map(Number);
  if (!Number.isInteger(width) || !Number.isInteger(height)) throw new Error(`${path}の寸法を取得できません`);
  return { width, height };
}

function foregroundComponents(inputPath) {
  const output = runMagick([
    inputPath,
    "-alpha", "extract",
    "-threshold", "1%",
    "-define", "connected-components:verbose=true",
    "-connected-components", "8",
    "null:",
  ]);
  return output.split("\n").flatMap((line) => {
    const match = line.match(/^\s*\d+:\s+(\d+)x(\d+)\+(\d+)\+(\d+)\s+([\d.]+),([\d.]+)\s+([\deE+.-]+)\s+(?:gray\(255\)|srgb\(255,255,255\))/);
    if (!match) return [];
    return [{
      width: Number(match[1]),
      height: Number(match[2]),
      x: Number(match[3]),
      y: Number(match[4]),
      centerX: Number(match[5]),
      centerY: Number(match[6]),
      area: Number(match[7]),
    }];
  }).sort((left, right) => right.area - left.area);
}

function findPoseCenters(inputPath) {
  const components = foregroundComponents(inputPath).slice(0, COLUMNS * ROWS);
  if (components.length !== COLUMNS * ROWS) {
    throw new Error(`主要なポーズを${COLUMNS * ROWS}個検出できませんでした（検出数: ${components.length}）`);
  }
  const byRow = components.sort((left, right) => left.centerY - right.centerY);
  return Array.from({ length: ROWS }, (_, row) => byRow
    .slice(row * COLUMNS, (row + 1) * COLUMNS)
    .sort((left, right) => left.centerX - right.centerX));
}

function normalize(inputPath, pngOutputPath, webpOutputPath) {
  accessSync(inputPath);
  const { width, height } = imageSize(inputPath);
  const workingDirectory = mkdtempSync(join(tmpdir(), "map-character-sheet-"));
  try {
    const cleanedInputPath = join(workingDirectory, "cleaned-input.png");
    runMagick([inputPath, "-fuzz", "4%", "-transparent", "#00ff00", cleanedInputPath]);
    const poses = findPoseCenters(cleanedInputPath);
    const rowCenters = poses.map((row) => row.reduce((sum, pose) => sum + pose.centerY, 0) / row.length);
    const yBoundaries = [0];
    for (let row = 0; row < ROWS - 1; row += 1) yBoundaries.push(Math.round((rowCenters[row] + rowCenters[row + 1]) / 2));
    yBoundaries.push(height);
    const rowPaths = [];
    for (let row = 0; row < ROWS; row += 1) {
      const centers = poses[row].map((pose) => pose.centerX);
      const xBoundaries = [0];
      for (let column = 0; column < COLUMNS - 1; column += 1) xBoundaries.push(Math.round((centers[column] + centers[column + 1]) / 2));
      xBoundaries.push(width);
      const framePaths = [];
      for (let column = 0; column < COLUMNS; column += 1) {
        const regionWidth = xBoundaries[column + 1] - xBoundaries[column];
        const regionHeight = yBoundaries[row + 1] - yBoundaries[row];
        const regionPath = join(workingDirectory, `region-${row}-${column}.png`);
        const trimmedPath = join(workingDirectory, `trimmed-${row}-${column}.png`);
        const resizedPath = join(workingDirectory, `resized-${row}-${column}.png`);
        const framePath = join(workingDirectory, `frame-${row}-${column}.png`);
        runMagick([
          cleanedInputPath,
          "-crop", `${regionWidth}x${regionHeight}+${xBoundaries[column]}+${yBoundaries[row]}`,
          "+repage",
          regionPath,
        ]);
        const mainComponent = foregroundComponents(regionPath)[0];
        if (!mainComponent) throw new Error(`${row}:${column}の主要ポーズを検出できません`);
        runMagick([
          regionPath,
          "-crop", `${mainComponent.width}x${mainComponent.height}+${mainComponent.x}+${mainComponent.y}`,
          "+repage",
          trimmedPath,
        ]);
        runMagick([trimmedPath, "-resize", `${CELL_WIDTH - FRAME_PADDING * 2}x${CELL_HEIGHT - FRAME_PADDING * 2}>`, resizedPath]);
        runMagick([
          "-size", `${CELL_WIDTH}x${CELL_HEIGHT}`,
          "canvas:none",
          resizedPath,
          "-gravity", "south",
          "-geometry", `+0+${FRAME_PADDING}`,
          "-composite",
          framePath,
        ]);
        framePaths.push(framePath);
      }
      const rowPath = join(workingDirectory, `row-${row}.png`);
      runMagick([...framePaths, "+append", rowPath]);
      rowPaths.push(rowPath);
    }
    const normalizedPath = join(workingDirectory, "walk.png");
    runMagick([...rowPaths, "-append", "-define", "png:color-type=6", normalizedPath]);
    renameSync(normalizedPath, pngOutputPath);
    runMagick([pngOutputPath, "-quality", "88", "-define", "webp:alpha-quality=100", webpOutputPath]);
  } finally {
    rmSync(workingDirectory, { recursive: true, force: true });
  }
  process.stdout.write(`${pngOutputPath} と ${webpOutputPath} を正規化しました\n`);
}

function inspectFrame(sheetPath, row, column, cellWidth, cellHeight) {
  const output = runMagick([
    sheetPath,
    "-crop", `${cellWidth}x${cellHeight}+${column * cellWidth}+${row * cellHeight}`,
    "+repage",
    "-trim",
    "-format", "%w %h %[fx:page.x] %[fx:page.y]",
    "info:",
  ]).trim();
  const [width, height, x, y] = output.split(/\s+/).map(Number);
  if (![width, height, x, y].every(Number.isFinite)) throw new Error(`${sheetPath}の${row}:${column}を検査できません`);
  return {
    width,
    height,
    x,
    y,
    centerX: x + width / 2,
    bottom: y + height,
    margins: [x, cellWidth - x - width, y, cellHeight - y - height],
  };
}

function validate(sheetPaths) {
  const errors = [];
  for (const sheetPath of sheetPaths) {
    const { width, height } = imageSize(sheetPath);
    if (width % COLUMNS !== 0 || height % ROWS !== 0) {
      errors.push(`${sheetPath}: 寸法${width}x${height}を3列×4行へ分割できません`);
      continue;
    }
    const cellWidth = width / COLUMNS;
    const cellHeight = height / ROWS;
    for (let row = 0; row < ROWS; row += 1) {
      const frames = Array.from({ length: COLUMNS }, (_, column) => inspectFrame(sheetPath, row, column, cellWidth, cellHeight));
      frames.forEach((frame, column) => {
        if (Math.min(...frame.margins) < 4) errors.push(`${sheetPath}: ${row}:${column}がセル境界へ近すぎます（余白 ${frame.margins.join("/")}px）`);
      });
      const centerXs = frames.map((frame) => frame.centerX);
      const bottoms = frames.map((frame) => frame.bottom);
      if (Math.max(...centerXs) - Math.min(...centerXs) > ALIGNMENT_TOLERANCE) {
        errors.push(`${sheetPath}: ${row}行目の中心軸が揃っていません（${centerXs.join("/")}）`);
      }
      if (Math.max(...bottoms) - Math.min(...bottoms) > ALIGNMENT_TOLERANCE) {
        errors.push(`${sheetPath}: ${row}行目の足元が揃っていません（${bottoms.join("/")}）`);
      }
    }
  }
  if (errors.length > 0) {
    errors.forEach(fail);
    return;
  }
  process.stdout.write(`${sheetPaths.length}シートの境界余白・中心軸・足元を確認しました\n`);
}

const [command, ...commandArguments] = process.argv.slice(2);
const args = commandArguments[0] === "--" ? commandArguments.slice(1) : commandArguments;
try {
  if (command === "normalize" && args.length === 3) normalize(args[0], args[1], args[2]);
  else if (command === "validate" && args.length > 0) validate(args);
  else throw new Error("normalize <入力PNG> <原本PNG> <配信用WebP> または validate <原本PNG...> を指定してください");
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
