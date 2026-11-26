Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\Praveen singh\.gemini\antigravity-ide\brain\6dfc364b-f721-469a-8b5a-cf69d31601a6\bright_luxury_app_icon_1791223260129.jpg"
$baseDir = "c:\airbnbmanager.github.io"
$assetsDir = Join-Path $baseDir "assets"
$backupDir = Join-Path $assetsDir "backup_icons"

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

$filesToBackup = @(
    (Join-Path $assetsDir "icon-512.png"),
    (Join-Path $assetsDir "icon-192.png"),
    (Join-Path $assetsDir "apple-touch-icon.png"),
    (Join-Path $baseDir "apple-touch-icon.png"),
    (Join-Path $assetsDir "favicon-32x32.png"),
    (Join-Path $assetsDir "favicon-16x16.png"),
    (Join-Path $baseDir "favicon.ico")
)

foreach ($f in $filesToBackup) {
    if (Test-Path $f) {
        Copy-Item -Path $f -Destination $backupDir -Force
    }
}

Write-Output "Backed up existing icons to $backupDir"

function Resize-Image {
    param(
        [System.Drawing.Image]$Image,
        [int]$Width,
        [int]$Height,
        [string]$DestinationPath
    )

    $destRect = New-Object System.Drawing.Rectangle(0, 0, $Width, $Height)
    $destBmp = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    $graphics = [System.Drawing.Graphics]::FromImage($destBmp)
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $graphics.DrawImage($Image, $destRect, 0, 0, $Image.Width, $Image.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()

    $destBmp.Save($DestinationPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Output "Generated: $DestinationPath ($Width x $Height)"
}

$srcImg = [System.Drawing.Image]::FromFile($sourcePath)

Resize-Image -Image $srcImg -Width 512 -Height 512 -DestinationPath (Join-Path $assetsDir "icon-512.png")
Resize-Image -Image $srcImg -Width 192 -Height 192 -DestinationPath (Join-Path $assetsDir "icon-192.png")
Resize-Image -Image $srcImg -Width 180 -Height 180 -DestinationPath (Join-Path $assetsDir "apple-touch-icon.png")
Resize-Image -Image $srcImg -Width 180 -Height 180 -DestinationPath (Join-Path $baseDir "apple-touch-icon.png")
Resize-Image -Image $srcImg -Width 32 -Height 32 -DestinationPath (Join-Path $assetsDir "favicon-32x32.png")
Resize-Image -Image $srcImg -Width 16 -Height 16 -DestinationPath (Join-Path $assetsDir "favicon-16x16.png")

# Generate favicon.ico from 32x32
$favBmp = New-Object System.Drawing.Bitmap(32, 32, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$favG = [System.Drawing.Graphics]::FromImage($favBmp)
$favG.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$favG.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$favG.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$favG.DrawImage($srcImg, 0, 0, 32, 32)
$favG.Dispose()

$hIcon = $favBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$icoFileStream = [System.IO.File]::OpenWrite((Join-Path $baseDir "favicon.ico"))
$icon.Save($icoFileStream)
$icoFileStream.Close()
$favBmp.Dispose()

$srcImg.Dispose()
Write-Output "Successfully updated all icons with glowing luxury design!"
