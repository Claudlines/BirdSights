#!/usr/bin/env node
/*
 * BirdSights environment setup helper.
 *
 * Creates local .env files from the tracked .env.example templates so a
 * beginner doesn't have to copy them by hand. It NEVER overwrites an existing
 * .env file, so your real keys are always safe. Run it with: npm run setup
 *
 * This script only copies placeholder example files — it never contains,
 * prints, or reads real API keys.
 */

const fs = require("fs");
const path = require("path");

// Project root is one level up from this /scripts folder, so the script works
// no matter which directory npm launches it from.
const root = path.resolve(__dirname, "..");

const TARGETS = [
  { example: path.join("server", ".env.example"), env: path.join("server", ".env") },
  { example: path.join("client", ".env.example"), env: path.join("client", ".env") },
];

const created = [];
const skipped = [];
const missingExample = [];

for (const t of TARGETS) {
  const examplePath = path.join(root, t.example);
  const envPath = path.join(root, t.env);

  if (!fs.existsSync(examplePath)) {
    missingExample.push(t.example);
    continue;
  }

  // Guard: never overwrite an existing .env. COPYFILE_EXCL makes the copy fail
  // if the destination already exists, on top of the explicit existsSync check.
  if (fs.existsSync(envPath)) {
    skipped.push(t.env);
    continue;
  }

  try {
    fs.copyFileSync(examplePath, envPath, fs.constants.COPYFILE_EXCL);
    created.push(t.env);
  } catch (err) {
    if (err && err.code === "EEXIST") {
      skipped.push(t.env); // created between the check and the copy — leave it
    } else {
      console.error(`  ! Could not create ${t.env}: ${err.message}`);
    }
  }
}

console.log("\nBirdSights environment setup");
console.log("============================\n");

if (created.length) {
  console.log("Created (from the safe example files):");
  created.forEach((f) => console.log(`  + ${f}`));
  console.log("");
}

if (skipped.length) {
  console.log("Already existed — left untouched (your keys are safe):");
  skipped.forEach((f) => console.log(`  = ${f}`));
  console.log("");
}

if (missingExample.length) {
  console.log("Could not find these example files (nothing copied):");
  missingExample.forEach((f) => console.log(`  ? ${f}`));
  console.log("");
}

console.log("Next steps");
console.log("----------");
console.log("1. Open server/.env and replace the placeholder keys with your own:");
console.log("     EBIRD_API_KEY   -> your free eBird key from https://ebird.org/api/keygen  (required)");
console.log("     OPENAI_API_KEY  -> your OpenAI key (OPTIONAL — only needed for Ask BirdSights)");
console.log("2. client/.env is already set to http://localhost:5000 — no change needed for local dev.");
console.log("3. Start the app from the project root with:  npm run dev");
console.log("");
console.log("Security reminder: never commit your .env files. They hold private keys and are");
console.log("already listed in .gitignore. Only the .env.example templates are tracked by Git.\n");
