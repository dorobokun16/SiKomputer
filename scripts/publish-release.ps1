param(
  [switch]$SkipApkBuild
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

# Tambahkan path Git & GitHub CLI per-user jika baru dipasang pada sesi yang sama
$extraPaths = @(
  (Join-Path $env:LOCALAPPDATA "Programs\Git\cmd"),
  "C:\Program Files\Git\cmd",
  (Join-Path $env:LOCALAPPDATA "Programs\GitHub CLI\bin"),
  (Join-Path $env:LOCALAPPDATA "Programs\GitHub CLI"),
  "C:\Program Files\GitHub CLI\bin",
  "C:\Program Files\GitHub CLI"
)
foreach ($p in $extraPaths) {
  if ((Test-Path $p) -and ($env:Path -notlike "*$p*")) {
    $env:Path = "$p;$env:Path"
  }
}

$pkg = Get-Content (Join-Path $root "package.json") -Raw | ConvertFrom-Json
$version = $pkg.version
$tag = "v$version"

Write-Host "==> 1. Typecheck & Build SiKomputer $tag..." -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $SkipApkBuild) {
  Write-Host "==> 2. Membangun paket portabel (.exe, .app.zip, .apk, web-dist.zip)..." -ForegroundColor Cyan
  if (-not $env:JAVA_HOME -and (Test-Path "C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot")) {
    $env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot"
  }
  python scripts/build-portables.py
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$standaloneWeb = Join-Path $env:LOCALAPPDATA "SiKomputer-Standalone\web"
if (Test-Path $standaloneWeb) {
  Remove-Item -Recurse -Force $standaloneWeb
  New-Item -ItemType Directory -Force $standaloneWeb | Out-Null
  Get-ChildItem (Join-Path $root "dist") -Exclude "downloads" | Copy-Item -Destination $standaloneWeb -Recurse -Force
}

Write-Host "==> 3. Push commit perubahan terbaru ke GitHub main..." -ForegroundColor Cyan
git add -A
$status = git status --porcelain
if ($status) {
  git commit -m "chore(release): publish SiKomputer $tag"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
git tag -f -a $tag -m "Release $tag"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
git push origin main
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> 4. Menerbitkan GitHub Release $tag beserta aset installer..." -ForegroundColor Cyan
$assets = @(
  "public/downloads/SiKomputer.apk",
  "public/downloads/SiKomputer.exe",
  "public/downloads/SiKomputer-macOS.zip",
  "public/downloads/SiKomputer-web-dist.zip",
  "dist/version.json"
) | Where-Object { Test-Path $_ }

$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
gh release view $tag --json tagName *>$null
$releaseExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prevEap

if ($releaseExists) {
  gh release upload $tag @assets --clobber
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
  $notes = ($pkg.sikomputer.releaseNotes | ForEach-Object { "- $_" }) -join "`n"
  if (-not $notes) { $notes = "Pembaruan SiKomputer $tag" }
  gh release create $tag @assets --target main --title "SiKomputer $tag" --notes $notes
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "SELESAI! Rilis $tag telah live di GitHub Releases & GitHub Pages sedang di-deploy." -ForegroundColor Green
