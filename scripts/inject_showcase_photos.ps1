$categorized = Get-Content 'scripts/airbnb_categorized_photos.json' -Raw -Encoding utf8 | ConvertFrom-Json
$showcasePath = 'js/showcase-data.js'
$showcaseCode = Get-Content $showcasePath -Raw -Encoding utf8

# Bump STORAGE_KEY
$showcaseCode = $showcaseCode -replace "const STORAGE_KEY = 'tuhh_showcase_data_v\d+';", "const STORAGE_KEY = 'tuhh_showcase_data_v210';"
Write-Output "Bumped STORAGE_KEY to v210"

foreach ($prop in $categorized.PSObject.Properties) {
    $code = $prop.Name
    $val = $prop.Value
    $sc = $val.standardCategories
    
    # Helper to format array
    function Format-List($items) {
        $lines = @()
        foreach ($u in $items) {
            $lines += "          `"$u`""
        }
        return ($lines -join ",`n")
    }
    
    $bedroomsStr = Format-List $sc.bedrooms
    $bathroomsStr = Format-List $sc.bathrooms
    $livingStr = Format-List $sc.living_hall
    $kitchenStr = Format-List $sc.kitchen
    $balconyStr = Format-List $sc.balcony
    $allStr = Format-List $sc.all
    
    $newPhotosBlock = @"
photos: {
        bedrooms: [
$bedroomsStr
        ],
        bathrooms: [
$bathroomsStr
        ],
        living_hall: [
$livingStr
        ],
        kitchen: [
$kitchenStr
        ],
        balcony: [
$balconyStr
        ],
        all: [
$allStr
        ]
      },
"@

    # Regex to find this property's photos block
    $pattern = "(?s)('$code':\s*\{[\s\S]*?)(photos:\s*\{[\s\S]*?\n\s*\},)"
    if ($showcaseCode -match $pattern) {
        $showcaseCode = [regex]::Replace($showcaseCode, $pattern, "${1}$newPhotosBlock")
        Write-Output "Updated $code ($($val.name)): Beds=$($sc.bedrooms.Count), Baths=$($sc.bathrooms.Count), Kitchen=$($sc.kitchen.Count), Balcony=$($sc.balcony.Count), Living=$($sc.living_hall.Count)"
    } else {
        Write-Output "WARNING: Could not find photos pattern for $code!"
    }
}

$showcaseCode | Out-File -FilePath $showcasePath -Encoding utf8
Write-Output "Successfully updated js/showcase-data.js!"
