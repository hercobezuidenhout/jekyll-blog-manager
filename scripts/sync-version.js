#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function validateSemver(version) {
  const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  return semverRegex.test(version);
}

function extractFlag(flag) {
  const args = process.argv;
  const flagIndex = args.findIndex(arg => arg.startsWith(flag));
  if (flagIndex === -1) return null;

  const flagArg = args[flagIndex];
  if (flagArg.includes('=')) {
    return flagArg.split('=')[1];
  }
  return args[flagIndex + 1];
}

function main() {
  const version = process.argv[2];

  if (!version) {
    console.error('Error: Version argument required');
    console.error('Usage: node sync-version.js <version> [--min-obsidian=X.X.X]');
    console.error('Example: node sync-version.js 1.2.3-beta.1');
    process.exit(1);
  }

  if (!validateSemver(version)) {
    console.error(`Error: Invalid semver format: ${version}`);
    console.error('Version must follow semantic versioning (e.g., 1.2.3 or 1.2.3-beta.1)');
    process.exit(1);
  }

  const minObsidian = extractFlag('--min-obsidian') || '0.15.0';

  if (!validateSemver(minObsidian)) {
    console.error(`Error: Invalid semver format for min-obsidian: ${minObsidian}`);
    process.exit(1);
  }

  const rootDir = path.join(__dirname, '..');

  try {
    const packageJsonPath = path.join(rootDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    pkg.version = version;
    fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`✓ Updated package.json to ${version}`);

    const manifestJsonPath = path.join(rootDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestJsonPath, 'utf8'));
    manifest.version = version;
    fs.writeFileSync(manifestJsonPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`✓ Updated manifest.json to ${version}`);

    const versionsJsonPath = path.join(rootDir, 'versions.json');
    const versions = JSON.parse(fs.readFileSync(versionsJsonPath, 'utf8'));
    versions[version] = minObsidian;
    fs.writeFileSync(versionsJsonPath, JSON.stringify(versions, null, 2) + '\n');
    console.log(`✓ Updated versions.json: ${version} -> ${minObsidian}`);

    console.log(`\n✅ Successfully synced version ${version} across all files`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
