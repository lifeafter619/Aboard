const fs = require('node:fs');
const path = require('node:path');

const rootDir = process.cwd();
const versionFile = path.join(rootDir, 'version.txt');
const markerStart = '<!-- version-badge:start -->';
const markerEnd = '<!-- version-badge:end -->';

function readVersion() {
  if (!fs.existsSync(versionFile)) {
    throw new Error('version.txt not found.');
  }

  const version = fs.readFileSync(versionFile, 'utf8').split(/\r?\n/, 1)[0].trim();
  if (!version) {
    throw new Error('version.txt is empty.');
  }

  return version;
}

function escapeBadgeMessage(value) {
  return value
    .replace(/-/g, '--')
    .replace(/_/g, '__')
    .replace(/ /g, '_');
}

function collectReadmeFiles() {
  const directories = [rootDir, path.join(rootDir, 'public')];
  const readmes = [];

  for (const directory of directories) {
    if (!fs.existsSync(directory)) {
      continue;
    }

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isFile()) {
        continue;
      }

      if (/^README(?:\..+)?\.md$/i.test(entry.name)) {
        readmes.push(path.join(directory, entry.name));
      }
    }
  }

  return readmes;
}

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function getRelativeVersionLink(readmeFile) {
  return toPosix(path.relative(path.dirname(readmeFile), versionFile));
}

function buildBadge(version, target) {
  return `[![Version](https://img.shields.io/badge/Version-${escapeBadgeMessage(version)}-f59e0b?style=for-the-badge&labelColor=111827)](${target})`;
}

function buildManagedBlock(version, target, eol) {
  return `${markerStart}${eol}${buildBadge(version, target)}${eol}${markerEnd}`;
}

function updateManagedBlock(content, version, fallbackTarget, eol) {
  const managedBlockPattern = /<!--\s*version-badge:start\s*-->[\s\S]*?<!--\s*version-badge:end\s*-->/i;

  return content.replace(managedBlockPattern, (block) => {
    const targetMatch = block.match(/\]\(([^)\r\n]*version\.txt[^)\r\n]*)\)/i);
    const target = targetMatch ? targetMatch[1] : fallbackTarget;
    return buildManagedBlock(version, target, eol);
  });
}

function updateHeuristically(content, version, fallbackTarget, eol) {
  const badgePattern = /\[\!\[(?<alt>[^\]]*)\]\((?<image>https?:\/\/img\.shields\.io\/badge\/[^)\r\n]+)\)\]\((?<target>[^)\r\n]+)\)/gi;
  let replaced = false;

  const nextContent = content.replace(
    badgePattern,
    (match, _alt, _image, _target, _offset, _input, groups) => {
      const image = groups?.image ?? '';
      const target = groups?.target ?? '';
      const normalizedTarget = target.trim().replace(/\\/g, '/');

      const isVersionBadge =
        /img\.shields\.io\/badge\//i.test(image) &&
        /version\.txt$/i.test(normalizedTarget);

      if (!isVersionBadge) {
        return match;
      }

      replaced = true;
      return buildManagedBlock(version, target || fallbackTarget, eol);
    }
  );

  if (!replaced) {
    throw new Error('Version badge not found. Please keep the managed marker block or a badge linked to version.txt.');
  }

  return nextContent;
}

function updateReadmeFile(readmeFile, version) {
  const original = fs.readFileSync(readmeFile, 'utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  const fallbackTarget = getRelativeVersionLink(readmeFile);

  let updated;
  if (/<!--\s*version-badge:start\s*-->[\s\S]*?<!--\s*version-badge:end\s*-->/i.test(original)) {
    updated = updateManagedBlock(original, version, fallbackTarget, eol);
  } else {
    updated = updateHeuristically(original, version, fallbackTarget, eol);
  }

  if (updated !== original) {
    fs.writeFileSync(readmeFile, updated, 'utf8');
    return true;
  }

  return false;
}

function main() {
  const version = readVersion();
  const readmeFiles = collectReadmeFiles();

  if (readmeFiles.length === 0) {
    throw new Error('No README files found.');
  }

  const changedFiles = [];
  for (const readmeFile of readmeFiles) {
    if (updateReadmeFile(readmeFile, version)) {
      changedFiles.push(path.relative(rootDir, readmeFile));
    }
  }

  if (changedFiles.length === 0) {
    console.log(`Version badge already synced to ${version}.`);
    return;
  }

  console.log(`Synced version badge to ${version}:`);
  for (const file of changedFiles) {
    console.log(`- ${file}`);
  }
}

main();
