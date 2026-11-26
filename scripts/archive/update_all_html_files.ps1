$data = Get-Content 'scripts/airbnb_categorized_photos.json' -Raw -Encoding utf8 | ConvertFrom-Json

$htmlMap = @{
    'the-dark-blue.html' = 'GOM-201'
    'the-unique.html' = 'GOM-302'
    'black-beauty.html' = 'GOM-102'
    'redrose-palace.html' = 'GOM-101'
    'the-brown.html' = 'GOM-202'
    'the-light-green.html' = 'GOM-301'
    'the-nawabi-stay.html' = 'GOM-401'
    'starlight-blue-penthouse.html' = 'GOM-501'
    'the-yellow-house.html' = 'VIL-105'
    'the-green-house.html' = 'VIL-104'
    'the-pink-house.html' = 'VIL-103'
    'gomti-grand-villa.html' = 'VIL-101'
    'royal-white-house.html' = 'VIL-102'
    'celebrity-garden.html' = 'LUL-402'
    'the-velvet-house.html' = 'VIL-107'
    'green-forest.html' = 'VIL-106'
    'pink-paradise.html' = 'VIL-108'
}

function ImgParam($u) {
    if (-not $u) { return "" }
    $uStr = $u.ToString()
    if ($uStr.Contains("?")) { return $uStr }
    return ($uStr + "?im_w=1200")
}

foreach ($filename in $htmlMap.Keys) {
    if (-not (Test-Path $filename)) {
        Write-Output "File not found: $filename"
        continue
    }

    $code = $htmlMap[$filename]
    $propData = $data.$code
    if (-not $propData) {
        Write-Output "No data for code $code ($filename)"
        continue
    }

    $content = [System.IO.File]::ReadAllText($filename, [System.Text.Encoding]::UTF8)
    $sc = $propData.standardCategories
    $allList = $sc.all
    $totalPhotos = $allList.Count

    $cover = if ($allList.Count -gt 0) { $allList[0] } else { "" }
    $livingPhoto = if ($sc.living_hall.Count -gt 0) { $sc.living_hall[0] } else { $cover }
    $bedPhoto = if ($sc.bedrooms.Count -gt 0) { $sc.bedrooms[0] } else { $cover }
    $bathPhoto = if ($sc.bathrooms.Count -gt 0) { $sc.bathrooms[0] } else { $cover }
    $balconyPhoto = if ($sc.balcony.Count -gt 0) { $sc.balcony[0] } elseif ($sc.kitchen.Count -gt 0) { $sc.kitchen[0] } else { $cover }

    $p0 = ImgParam $cover
    $p1 = ImgParam $livingPhoto
    $p2 = ImgParam $bedPhoto
    $p3 = ImgParam $bathPhoto
    $p4 = ImgParam $balconyPhoto

    # 1. Update JSON-LD images
    $jsonLdRegex = '(?s)("image":\s*\[)([\s\S]*?)(\])'
    $newImagesJson = "`"image`": [`n    `"$p0`",`n    `"$p1`",`n    `"$p2`",`n    `"$p3`",`n    `"$p4`"`n  ]"
    $content = [regex]::Replace($content, $jsonLdRegex, $newImagesJson)

    # 2. Update luxe-photo-mosaic
    $mosaicRegex = '(?s)<section id="luxe-photo-mosaic"[\s\S]*?<\/section>'
    $newMosaic = @"
<section id="luxe-photo-mosaic" class="luxe-photo-mosaic" aria-label="Property Gallery">
    <div class="luxe-photo-item luxe-photo-main" onclick="window.luxeEngine && window.luxeEngine.openGallery(0, 'all')" title="View All Photos">
      <img alt="$($propData.name) Lead Photo" src="$p0" loading="eager"/>
    </div>
    <div class="luxe-photo-item" onclick="window.luxeEngine && window.luxeEngine.openGallery(0, 'Living & Dining')" title="View Living & Dining">
      <img alt="$($propData.name) Living Area" src="$p1" loading="lazy"/>
    </div>
    <div class="luxe-photo-item" onclick="window.luxeEngine && window.luxeEngine.openGallery(0, 'Bedrooms')" title="View Bedrooms">
      <img alt="$($propData.name) Bedroom" src="$p2" loading="lazy"/>
    </div>
    <div class="luxe-photo-item" onclick="window.luxeEngine && window.luxeEngine.openGallery(0, 'Bathrooms')" title="View Bathrooms">
      <img alt="$($propData.name) Bathroom" src="$p3" loading="lazy"/>
    </div>
    <div class="luxe-photo-item" onclick="window.luxeEngine && window.luxeEngine.openGallery(0, 'Balcony & Views')" title="View Balcony & Views">
      <img alt="$($propData.name) Balcony View" src="$p4" loading="lazy"/>
    </div>
    <button type="button" class="luxe-btn-show-all" onclick="window.luxeEngine && window.luxeEngine.openGallery(0, 'all')">
      &#128247; Show all $totalPhotos photos
    </button>
  </section>
"@
    $content = [regex]::Replace($content, $mosaicRegex, $newMosaic)

    # 3. Add or update luxe-category-strip
    $stripHtml = @"
  <div id="luxe-category-strip" class="luxe-category-strip">
    <button type="button" class="luxe-category-chip active" onclick="window.luxeEngine && window.luxeEngine.openGallery(0, 'all')">
      <span>&#128247;</span> <span>All Photos</span> <span class="chip-count">($totalPhotos)</span>
    </button>
    <button type="button" class="luxe-category-chip" onclick="window.luxeEngine && window.luxeEngine.openGallery(0, 'Bedrooms')">
      <span>&#128716;</span> <span>Bedrooms</span> <span class="chip-count">($($sc.bedrooms.Count))</span>
    </button>
    <button type="button" class="luxe-category-chip" onclick="window.luxeEngine && window.luxeEngine.openGallery(0, 'Bathrooms')">
      <span>&#128703;</span> <span>Bathrooms</span> <span class="chip-count">($($sc.bathrooms.Count))</span>
    </button>
    <button type="button" class="luxe-category-chip" onclick="window.luxeEngine && window.luxeEngine.openGallery(0, 'Kitchen')">
      <span>&#127859;</span> <span>Kitchen</span> <span class="chip-count">($($sc.kitchen.Count))</span>
    </button>
    <button type="button" class="luxe-category-chip" onclick="window.luxeEngine && window.luxeEngine.openGallery(0, 'Living & Dining')">
      <span>&#128715;</span> <span>Living & Dining</span> <span class="chip-count">($($sc.living_hall.Count))</span>
    </button>
    <button type="button" class="luxe-category-chip" onclick="window.luxeEngine && window.luxeEngine.openGallery(0, 'Balcony & Views')">
      <span>&#127807;</span> <span>Balcony & Views</span> <span class="chip-count">($($sc.balcony.Count))</span>
    </button>
  </div>
"@

    if ($content.Contains('id="luxe-category-strip"')) {
        $content = [regex]::Replace($content, '(?s)<div id="luxe-category-strip"[\s\S]*?<\/div>', $stripHtml)
    } else {
        $firstSectionRegex = [regex]'<\/section>'
        $content = $firstSectionRegex.Replace($content, "</section>`n`n$stripHtml", 1)
    }

    # 4. Bump version queries in script tags
    $content = $content -replace 'showcase-data\.js\?v=\d+', 'showcase-data.js?v=210'
    $content = $content -replace 'property-engine\.js\?v=\d+', 'property-engine.js?v=210'
    $content = $content -replace 'property-luxe\.css(\?v=\d+)?', 'property-luxe.css?v=210'

    [System.IO.File]::WriteAllText($filename, $content, [System.Text.UTF8Encoding]::new($false))
    Write-Output "Updated $filename ($($propData.name)) with $totalPhotos categorized photos"
}

# Update admin.html
if (Test-Path 'admin.html') {
    $admin = [System.IO.File]::ReadAllText('admin.html', [System.Text.Encoding]::UTF8)
    $admin = $admin -replace 'property-engine\.js\?v=\d+', 'property-engine.js?v=210'
    $admin = $admin -replace 'showcase-data\.js\?v=\d+', 'showcase-data.js?v=210'
    [System.IO.File]::WriteAllText('admin.html', $admin, [System.Text.UTF8Encoding]::new($false))
    Write-Output "Updated admin.html script tags"
}
