#!/usr/bin/env node
/**
 * Copy built plugin artifacts into the Obsidian vault plugin folder.
 * Obsidian often fails to load plugins that are symlinks outside the vault,
 * so we deploy real files instead of linking the whole repo.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const vaultPlugin =
  process.env.OBSIDIAN_PLUGIN_DIR ||
  "/Users/peterkjackson/Obsidian-Vault/.obsidian/plugins/notion-vault-sync";

const files = ["main.js", "manifest.json", "styles.css"];
for (const f of files) {
  if (!existsSync(join(root, f))) {
    console.error(`Missing ${f} — run npm run build first`);
    process.exit(1);
  }
}

mkdirSync(vaultPlugin, { recursive: true });

// Preserve existing data.json in the vault if present; otherwise copy from repo.
const vaultData = join(vaultPlugin, "data.json");
const repoData = join(root, "data.json");
let preservedData = null;
if (existsSync(vaultData)) {
  preservedData = readFileSync(vaultData);
} else if (existsSync(repoData)) {
  preservedData = readFileSync(repoData);
}

for (const f of files) {
  copyFileSync(join(root, f), join(vaultPlugin, f));
  console.log(`copied ${f} → ${vaultPlugin}`);
}

if (preservedData) {
  writeFileSync(vaultData, preservedData);
  console.log(`preserved data.json`);
}

console.log("Deployed. Reload the plugin in Obsidian (or restart).");
