# Frontend libraries

The libraries that `fhirUI` serves come from npm, pinned in `package-lock.json`. `package.json` lists them under `dependencies`. Its `vendorFiles` map says which file of each package is copied to which path under `fhirUI/assets/vendor`. The files are committed, so the portal needs no build step.

To add or update a library:

```
cd vendor
npm install --save-exact --ignore-scripts <package>@<version>   # updates package.json and package-lock.json
# list the files the pages load in vendorFiles
node sync.mjs                       # copies them, deletes unlisted files in the managed folders
```

Then point the `<script>` or `<link>` tag at the new path, and commit `vendor/` together with `fhirUI/assets/vendor`.

CI runs `npm ci --ignore-scripts`, `node vendor/sync.mjs --check` and `npm audit --audit-level=moderate`. The check fails when a vendored file differs from the package, for example after an edit by hand, or when a managed folder holds a file that is not listed. A managed folder is the first path segment of a target, such as `jquery/`.

A library that does not come from npm, such as the Looper theme or the jQuery build of fhir.js, is listed in `INVENTORY.md` with its origin.
