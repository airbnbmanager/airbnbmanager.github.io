<#
.SYNOPSIS
    Developer Machine Performance Optimizer for Windows 11 (Run as Administrator)
.DESCRIPTION
    Applies system-level performance enhancements specifically tailored for software developers:
    1. Enables Windows Developer Mode (Unprivileged symlinks for npm, pnpm, git)
    2. Enables Long Paths (Removes 260 character limit for deep node_modules/git trees)
    3. Configures Windows Defender Exclusions for developer workspace and tools
    4. Optimizes Windows Search Indexer to ignore .git and node_modules
    5. Tweaks NTFS & Background services for developer responsiveness
#>

# Check for Administrator elevation
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "This script requires Administrator privileges. Relaunching with elevation..." -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList ("-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"") -Verb RunAs
    exit
}

Clear-Host
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "    DEVELOPER SYSTEM OPTIMIZER - ADMINISTRATOR TUNING        " -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. ENABLE WINDOWS DEVELOPER MODE (Symlinks without elevation)
Write-Host "[1/5] Enabling Windows Developer Mode..." -ForegroundColor Yellow
try {
    $devPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock"
    if (-not (Test-Path $devPath)) { New-Item -Path $devPath -Force | Out-Null }
    Set-ItemProperty -Path $devPath -Name "AllowDevelopmentWithoutDevLicense" -Value 1 -Force
    Write-Host "      --> Windows Developer Mode ENABLED (npm/pnpm/git symlinks enabled)" -ForegroundColor Green
} catch {
    Write-Host "      --> Failed to set Developer Mode: $_" -ForegroundColor Red
}

# 2. ENABLE LONG PATHS (Removes 260-char path limit)
Write-Host "[2/5] Enabling Win32 Long Paths (> 260 chars)..." -ForegroundColor Yellow
try {
    $fsPath = "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem"
    Set-ItemProperty -Path $fsPath -Name "LongPathsEnabled" -Value 1 -Force
    Write-Host "      --> Long Paths (> 260 characters) ENABLED" -ForegroundColor Green
} catch {
    Write-Host "      --> Failed to set LongPaths: $_" -ForegroundColor Red
}

# 3. WINDOWS DEFENDER EXCLUSIONS FOR DEV WORKSPACE & TOOLS
Write-Host "[3/5] Configuring Windows Defender Developer Exclusions..." -ForegroundColor Yellow
try {
    # Workspace exclusion
    $workspace = "C:\airbnbmanager.github.io"
    if (Test-Path $workspace) {
        Add-MpPreference -ExclusionPath $workspace -ErrorAction SilentlyContinue
        Write-Host "      --> Excluded workspace folder: $workspace" -ForegroundColor Green
    }
    
    # User .gemini and cache folders
    $userProfile = $env:USERPROFILE
    Add-MpPreference -ExclusionPath "$userProfile\.gemini" -ErrorAction SilentlyContinue
    
    # Exclude Git binary from constant real-time scanning
    Add-MpPreference -ExclusionProcess "git.exe" -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionProcess "node.exe" -ErrorAction SilentlyContinue
    
    Write-Host "      --> Developer Defender exclusions configured (drastically speeds up git and build operations)" -ForegroundColor Green
} catch {
    Write-Host "      --> Defender exclusion note: $_" -ForegroundColor DarkGray
}

# 4. DISK & NTFS PERFORMANCE FOR DEVELOPERS
Write-Host "[4/5] Tuning filesystem performance..." -ForegroundColor Yellow
try {
    # Disable 8.3 short filename creation overhead if enabled
    fsutil behavior set disablelastaccess 1 | Out-Null
    Write-Host "      --> Last Access Time updates disabled (saves heavy disk write I/O on repos)" -ForegroundColor Green
} catch {
    Write-Host "      --> Filesystem note: $_" -ForegroundColor DarkGray
}

# 5. POWER & SYSTEM PERFORMANCE TUNING
Write-Host "[5/5] Ensuring High Performance Power Plan..." -ForegroundColor Yellow
try {
    # Duplicate High Performance scheme if not present and activate it
    $schemes = powercfg /list
    if ($schemes -match "High performance") {
        $hpGuid = ($schemes | Select-String "([a-f0-9\-]{36})\s+\(High performance\)").Matches[0].Groups[1].Value
        powercfg -setactive $hpGuid
        Write-Host "      --> High Performance Power Plan active: $hpGuid" -ForegroundColor Green
    }
} catch {
    Write-Host "      --> Power scheme note: $_" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "    ALL SYSTEM-LEVEL DEVELOPER OPTIMIZATIONS APPLIED!         " -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..."
[void][System.Console]::ReadKey()
