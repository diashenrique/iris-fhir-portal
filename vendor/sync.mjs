// Copies the files listed in package.json "vendorFiles" (node_modules path -> path under fhirUI/assets/vendor)
// from node_modules into the portal, byte for byte.
//   node vendor/sync.mjs           copy, and delete files of the managed folders that are not listed
//   node vendor/sync.mjs --check   change nothing; exit 1 if a listed file differs from node_modules or a managed
//                                  folder holds a file that is not listed (an edit by hand, a leftover copy)
// A managed folder is the first path segment of a target (jquery/ for jquery/jquery.min.js): the manifest owns it.
// Run npm ci in vendor/ first.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const modules = join(here, 'node_modules');
const target = join(here, '..', 'fhirUI', 'assets', 'vendor');
const check = process.argv.includes('--check');
const { vendorFiles } = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'));

/** Every file under dir, as paths relative to target with forward slashes */
function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [relative(target, path).split(sep).join('/')];
  });
}

const problems = [];
const listed = new Set(Object.values(vendorFiles));
for (const [source, dest] of Object.entries(vendorFiles)) {
  const from = join(modules, source);
  if (!existsSync(from)) {
    problems.push(`missing in node_modules: ${source} (run npm ci in vendor/)`);
    continue;
  }
  const to = join(target, dest);
  const wanted = readFileSync(from);
  if (existsSync(to) && readFileSync(to).equals(wanted)) continue;
  if (check) {
    problems.push(`differs from ${source}: ${dest}`);
  } else {
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, wanted);
    console.log(`copied ${dest}`);
  }
}

const managed = new Set([...listed].map((dest) => dest.split('/')[0]));
for (const file of [...managed].flatMap((folder) => walk(join(target, folder)))) {
  if (listed.has(file)) continue;
  if (check) {
    problems.push(`not in the manifest: ${file}`);
  } else {
    rmSync(join(target, file));
    console.log(`deleted ${file}`);
  }
}

if (problems.length) {
  for (const problem of problems) console.log(`FAIL  ${problem}`);
  process.exit(1);
}
console.log(`${check ? 'vendor check passed' : 'vendor in sync'}: ${listed.size} file(s) in ${[...managed].join(', ')}`);
