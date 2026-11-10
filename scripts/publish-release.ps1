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
  (Join-Path $env:LOCALAPPDATA "Programs\GitHub CLI"),
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
npm run build

if (-not $SkipApkBuild) {
  Write-Host "==> 2. Membangun paket portabel (.exe, .app.zip, .apk, web-dist.zip)..." -ForegroundColor Cyan
  python scripts/build-portables.py
}

Write-Host "==> 3. Push commit perubahan terbaru ke GitHub main..." -ForegroundColor Cyan
git add -A
$status = git status --porcelain
if ($status) {
  git commit -m "chore(release): publish SiKomputer $tag"
}
git push origin main

Write-Host "==> 4. Menerbitkan GitHub Release $tag beserta aset installer..." -ForegroundColor Cyan
$assets = @(
  "public/downloads/SiKomputer.apk",
  "public/downloads/SiKomputer.exe",
  "public/downloads/SiKomputer-macOS.zip",
  "public/downloads/SiKomputer-web-dist.zip",
  "dist/version.json"
) | Where-Object { Test-Path $_ }

$existing = gh release view $tag --json tagName 2>$null
if ($LASTEXITCODE -eq 0) {
  gh release upload $tag @assets --clobber
} else {
  $notes = ($pkg.sikomputer.releaseNotes | ForEach-Object { "- $_" }) -join "`n"
  if (-not $notes) { $notes = "Pembaruan SiKomputer $tag" }
  gh release create $tag @assets --title "SiKomputer $tag" --notes $notes
}

Write-Host "SELESAI! Rilis $tag telah live di GitHub Releases & GitHub Pages sedang di-deploy." -ForegroundColor Green
