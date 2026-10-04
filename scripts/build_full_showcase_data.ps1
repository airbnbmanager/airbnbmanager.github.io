Add-Type -AssemblyName System.Web
$ErrorActionPreference = 'Stop'

# Load the categorized photos JSON
$photosJson = Get-Content 'scripts\airbnb_categorized_photos.json' -Raw | ConvertFrom-Json

function Normalize-Url($u) {
    if (-not $u) { return "" }
    return ($u.Split('?')[0]).Trim()
}

$lines = Get-Content 'scripts\showcase_backup_a91f968.js'

$properties = [ordered]@{}
$currentCode = $null
$currentBlock = New-Object System.Collections.Generic.List[string]
$inBaseline = $false

for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    if ($line -match '^\s*const BASELINE_PROPERTIES = \{') {
        $inBaseline = $true
        continue
    }
    if ($inBaseline -and $line -match '^\s*\}\;\s*$') {
        if ($currentCode -and $currentBlock.Count -gt 0) {
            $properties[$currentCode] = $currentBlock.ToArray()
        }
        break
    }
    if ($inBaseline) {
        if ($line -match '^\s*''([A-Z0-9\-]+)'':\s*\{') {
            if ($currentCode -and $currentBlock.Count -gt 0) {
                $properties[$currentCode] = $currentBlock.ToArray()
            }
            $currentCode = $matches[1]
            $currentBlock = New-Object System.Collections.Generic.List[string]
            $currentBlock.Add($line)
        } elseif ($currentCode) {
            $currentBlock.Add($line)
        }
    }
}

Write-Host "Found $($properties.Keys.Count) properties in backup."

function Extract-Field($propLines, $fieldName) {
    $pat1 = "^\s*" + [regex]::Escape($fieldName) + ":\s*(['`""])(.*?)\1,?\s*$"
    $pat2 = "^\s*" + [regex]::Escape($fieldName) + ":\s*([0-9\.]+),?\s*$"
    foreach ($l in $propLines) {
        if ($l -match $pat1) {
            return $matches[2]
        }
        if ($l -match $pat2) {
            return $matches[1]
        }
    }
    return $null
}

function Extract-Array($propLines, $fieldName) {
    $pat = "^\s*" + [regex]::Escape($fieldName) + ":\s*\["
    $inField = $false
    $items = New-Object System.Collections.Generic.List[string]
    foreach ($l in $propLines) {
        if ($l -match $pat) {
            $inField = $true
            if ($l -match "\[(.*?)\]") {
                $content = $matches[1]
                $regex = [regex]"'(.*?)'|""(.*?)"""
                $m = $regex.Matches($content)
                foreach ($match in $m) {
                    $val = if ($match.Groups[1].Success) { $match.Groups[1].Value } else { $match.Groups[2].Value }
                    $items.Add($val)
                }
                return $items.ToArray()
            }
            continue
        }
        if ($inField) {
            if ($l -match "^\s*\]") {
                break
            }
            $regex = [regex]"'(.*?)'|""(.*?)"""
            $m = $regex.Matches($l)
            foreach ($match in $m) {
                $val = if ($match.Groups[1].Success) { $match.Groups[1].Value } else { $match.Groups[2].Value }
                $items.Add($val)
            }
        }
    }
    return $items.ToArray()
}

function Extract-Landmarks($propLines) {
    $inLandmarks = $false
    $landmarks = New-Object System.Collections.Generic.List[PSObject]
    foreach ($l in $propLines) {
        if ($l -match "landmarks:\s*\[") {
            $inLandmarks = $true
            continue
        }
        if ($inLandmarks) {
            if ($l -match "^\s*\]") { break }
            if ($l -match "name:\s*'(.*?)',\s*time:\s*'(.*?)'") {
                $landmarks.Add([PSCustomObject]@{ name = $matches[1]; time = $matches[2] })
            }
        }
    }
    return $landmarks.ToArray()
}

function Escape-Js($str) {
    if (-not $str) { return "" }
    return $str.Replace("\", "\\").Replace("'", "\'").Replace("`r", "").Replace("`n", "\n")
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine(@"
/**
 * Showcase Data & Dynamic CMS Layer
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED
 * Auto-generated with genuine Airbnb categorized footage for all 17 properties.
 */

(function(window) {
  'use strict';

  const STORAGE_KEY = 'tuhh_showcase_data_v220';

  // Invalidate legacy cache containing dummy or broken property objects
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('uhhs_showcase_data_v1');
      localStorage.removeItem('uhhs_showcase_data_v2');
      localStorage.removeItem('tuhh_showcase_data_v208');
      localStorage.removeItem('tuhh_showcase_data_v210');
    }
  } catch (e) {}

  // Baseline Curated Data for All 17 Properties
  const BASELINE_PROPERTIES = {
"@)

$propIndex = 0
$totalProps = $properties.Keys.Count

foreach ($code in $properties.Keys) {
    $propLines = $properties[$code]
    $slug = Extract-Field $propLines 'slug'
    $name = Extract-Field $propLines 'name'
    $type = Extract-Field $propLines 'type'
    $category = Extract-Field $propLines 'category'
    $area = Extract-Field $propLines 'area'
    $area_name = Extract-Field $propLines 'area_name'
    $address = Extract-Field $propLines 'address'
    $rating = Extract-Field $propLines 'rating'
    $reviews = Extract-Field $propLines 'reviews'
    $max_guests = Extract-Field $propLines 'max_guests'
    $bedrooms = Extract-Field $propLines 'bedrooms'
    $bathrooms = Extract-Field $propLines 'bathrooms'
    $beds = Extract-Field $propLines 'beds'
    $base_price = Extract-Field $propLines 'base_price'
    $airbnb_price = Extract-Field $propLines 'airbnb_price'
    $video_url = Extract-Field $propLines 'video_url'
    $map_link = Extract-Field $propLines 'map_link'
    $map_embed = Extract-Field $propLines 'map_embed'
    $description = Extract-Field $propLines 'description'
    $amenities = Extract-Array $propLines 'amenities'
    $landmarks = Extract-Landmarks $propLines

    # Find categorized photos from $photosJson
    $photoData = $null
    if ($photosJson.PSObject.Properties[$code]) {
        $photoData = $photosJson.PSObject.Properties[$code].Value
    } else {
        foreach ($p in $photosJson.PSObject.Properties) {
            if ($p.Value.slug -eq $slug -or $p.Value.code -eq $code) {
                $photoData = $p.Value
                break
            }
        }
    }

    $catBedrooms = [System.Collections.Generic.List[string]]::new()
    $catBathrooms = [System.Collections.Generic.List[string]]::new()
    $catKitchen = [System.Collections.Generic.List[string]]::new()
    $catLiving = [System.Collections.Generic.List[string]]::new()
    $catBalcony = [System.Collections.Generic.List[string]]::new()
    $allPhotos = [System.Collections.Generic.List[string]]::new()
    $seenUrls = [System.Collections.Generic.HashSet[string]]::new()

    if ($photoData -and $photoData.rawCategories) {
        foreach ($catProp in $photoData.rawCategories.PSObject.Properties) {
            $catTitle = $catProp.Name
            $catList = $catProp.Value
            
            foreach ($url in $catList) {
                if (-not $url -or $url.Contains('unsplash.com')) { continue }
                $norm = Normalize-Url $url
                if (-not $seenUrls.Contains($norm)) {
                    [void]$seenUrls.Add($norm)
                    [void]$allPhotos.Add($url)
                }

                if ($catTitle -like '*Bedroom*' -or $catTitle -like '*bed*') {
                    if (-not ($catBedrooms -contains $url)) { [void]$catBedrooms.Add($url) }
                } elseif ($catTitle -like '*Bathroom*' -or $catTitle -like '*bath*') {
                    if (-not ($catBathrooms -contains $url)) { [void]$catBathrooms.Add($url) }
                } elseif ($catTitle -like '*Kitchen*') {
                    if (-not ($catKitchen -contains $url)) { [void]$catKitchen.Add($url) }
                } elseif ($catTitle -like '*Living*' -or $catTitle -like '*Dining*') {
                    if (-not ($catLiving -contains $url)) { [void]$catLiving.Add($url) }
                } else {
                    if (-not ($catBalcony -contains $url)) { [void]$catBalcony.Add($url) }
                }
            }
        }
    }

    # Fallback to backup photos if no new photos found
    if ($allPhotos.Count -eq 0) {
        $oldBedrooms = Extract-Array $propLines 'bedrooms'
        $oldBathrooms = Extract-Array $propLines 'bathrooms'
        $oldKitchen = Extract-Array $propLines 'kitchen'
        $oldLiving = Extract-Array $propLines 'living_hall'
        $oldBalcony = Extract-Array $propLines 'balcony'
        $oldAll = Extract-Array $propLines 'all'
        
        foreach ($u in $oldBedrooms) { [void]$catBedrooms.Add($u); [void]$allPhotos.Add($u) }
        foreach ($u in $oldBathrooms) { [void]$catBathrooms.Add($u); [void]$allPhotos.Add($u) }
        foreach ($u in $oldKitchen) { [void]$catKitchen.Add($u); [void]$allPhotos.Add($u) }
        foreach ($u in $oldLiving) { [void]$catLiving.Add($u); [void]$allPhotos.Add($u) }
        foreach ($u in $oldBalcony) { [void]$catBalcony.Add($u); [void]$allPhotos.Add($u) }
        foreach ($u in $oldAll) { if (-not ($allPhotos -contains $u)) { [void]$allPhotos.Add($u) } }
    }

    $coverImg = if ($allPhotos.Count -gt 0) { $allPhotos[0] } else { Extract-Field $propLines 'cover_image' }

    Write-Host "Property $code ($name): $($allPhotos.Count) total photos (Beds: $($catBedrooms.Count), Baths: $($catBathrooms.Count), Kit: $($catKitchen.Count), Liv: $($catLiving.Count), Balc: $($catBalcony.Count))"

    [void]$sb.AppendLine("    '$code': {")
    [void]$sb.AppendLine("      id: '$code',")
    [void]$sb.AppendLine("      slug: '$slug',")
    [void]$sb.AppendLine("      name: '$(Escape-Js $name)',")
    [void]$sb.AppendLine("      type: '$(Escape-Js $type)',")
    [void]$sb.AppendLine("      category: '$category',")
    [void]$sb.AppendLine("      area: '$area',")
    [void]$sb.AppendLine("      area_name: '$(Escape-Js $area_name)',")
    [void]$sb.AppendLine("      address: '$(Escape-Js $address)',")
    [void]$sb.AppendLine("      rating: $(if ($rating) { $rating } else { '4.92' }),")
    [void]$sb.AppendLine("      reviews: $(if ($reviews) { $reviews } else { '42' }),")
    [void]$sb.AppendLine("      max_guests: $(if ($max_guests) { $max_guests } else { '10' }),")
    [void]$sb.AppendLine("      bedrooms: $(if ($bedrooms) { $bedrooms } else { '3' }),")
    [void]$sb.AppendLine("      bathrooms: $(if ($bathrooms) { $bathrooms } else { '3' }),")
    [void]$sb.AppendLine("      beds: '$(Escape-Js $beds)',")
    [void]$sb.AppendLine("      base_price: $(if ($base_price) { $base_price } else { '3499' }),")
    [void]$sb.AppendLine("      airbnb_price: $(if ($airbnb_price) { $airbnb_price } else { '4199' }),")
    [void]$sb.AppendLine("      cover_image: '$coverImg',")
    [void]$sb.AppendLine("      video_url: '$(if ($video_url) { $video_url } else { 'https://www.youtube.com/embed/dQw4w9WgXcQ' })',")
    [void]$sb.AppendLine("      map_link: '$map_link',")
    [void]$sb.AppendLine("      map_embed: '$map_embed',")
    [void]$sb.AppendLine("      photos: {")
    
    # bedrooms array
    [void]$sb.AppendLine("        bedrooms: [")
    for ($k = 0; $k -lt $catBedrooms.Count; $k++) {
        $comma = if ($k -lt $catBedrooms.Count - 1) { "," } else { "" }
        [void]$sb.AppendLine("          `"$($catBedrooms[$k])`"$comma")
    }
    [void]$sb.AppendLine("        ],")

    # bathrooms array
    [void]$sb.AppendLine("        bathrooms: [")
    for ($k = 0; $k -lt $catBathrooms.Count; $k++) {
        $comma = if ($k -lt $catBathrooms.Count - 1) { "," } else { "" }
        [void]$sb.AppendLine("          `"$($catBathrooms[$k])`"$comma")
    }
    [void]$sb.AppendLine("        ],")

    # kitchen array
    [void]$sb.AppendLine("        kitchen: [")
    for ($k = 0; $k -lt $catKitchen.Count; $k++) {
        $comma = if ($k -lt $catKitchen.Count - 1) { "," } else { "" }
        [void]$sb.AppendLine("          `"$($catKitchen[$k])`"$comma")
    }
    [void]$sb.AppendLine("        ],")

    # living_hall array
    [void]$sb.AppendLine("        living_hall: [")
    for ($k = 0; $k -lt $catLiving.Count; $k++) {
        $comma = if ($k -lt $catLiving.Count - 1) { "," } else { "" }
        [void]$sb.AppendLine("          `"$($catLiving[$k])`"$comma")
    }
    [void]$sb.AppendLine("        ],")

    # balcony array
    [void]$sb.AppendLine("        balcony: [")
    for ($k = 0; $k -lt $catBalcony.Count; $k++) {
        $comma = if ($k -lt $catBalcony.Count - 1) { "," } else { "" }
        [void]$sb.AppendLine("          `"$($catBalcony[$k])`"$comma")
    }
    [void]$sb.AppendLine("        ],")

    # all array
    [void]$sb.AppendLine("        all: [")
    for ($k = 0; $k -lt $allPhotos.Count; $k++) {
        $comma = if ($k -lt $allPhotos.Count - 1) { "," } else { "" }
        [void]$sb.AppendLine("          `"$($allPhotos[$k])`"$comma")
    }
    [void]$sb.AppendLine("        ]")
    [void]$sb.AppendLine("      },")

    # amenities
    [void]$sb.AppendLine("      amenities: [")
    for ($k = 0; $k -lt $amenities.Length; $k++) {
        $comma = if ($k -lt $amenities.Length - 1) { "," } else { "" }
        [void]$sb.AppendLine("        '$(Escape-Js $amenities[$k])'$comma")
    }
    [void]$sb.AppendLine("      ],")

    # landmarks
    [void]$sb.AppendLine("      landmarks: [")
    for ($k = 0; $k -lt $landmarks.Length; $k++) {
        $comma = if ($k -lt $landmarks.Length - 1) { "," } else { "" }
        $lm = $landmarks[$k]
        [void]$sb.AppendLine("        { name: '$(Escape-Js $lm.name)', time: '$(Escape-Js $lm.time)' }$comma")
    }
    [void]$sb.AppendLine("      ],")

    # description
    [void]$sb.AppendLine("      description: '$(Escape-Js $description)'")

    $propIndex++
    $propComma = if ($propIndex -lt $totalProps) { "," } else { "" }
    [void]$sb.AppendLine("    }$propComma")
}

[void]$sb.AppendLine(@"
  };

  // Get merged properties (Baseline + LocalStorage + Database cache)
  function getShowcaseProperties() {
    let custom = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) custom = JSON.parse(raw);
    } catch (e) {
      console.warn('Error reading showcase cache:', e);
    }

    const merged = {};
    Object.keys(BASELINE_PROPERTIES).forEach(id => {
      const base = BASELINE_PROPERTIES[id];
      const cust = custom[id] || {};
      const prop = Object.assign({}, base, cust);

      // Strictly ensure real Airbnb photos and cover from baseline are preserved
      if (!cust.photos || JSON.stringify(cust.photos).includes('unsplash') || (Array.isArray(cust.photos) && cust.photos.length === 0)) {
        prop.photos = base.photos;
      }
      if (!prop.cover_image || prop.cover_image.includes('unsplash')) {
        prop.cover_image = base.cover_image;
      }
      merged[id] = prop;
    });
    // Add any completely new custom properties
    Object.keys(custom).forEach(id => {
      if (!merged[id]) merged[id] = custom[id];
    });

    return merged;
  }

  // Get single property by ID or Slug
  function getShowcaseProperty(idOrSlug) {
    if (!idOrSlug) return null;
    const all = getShowcaseProperties();
    if (all[idOrSlug]) return all[idOrSlug];
    const found = Object.values(all).find(p => p.slug === idOrSlug || p.id === idOrSlug);
    if (found) return found;
    // Fallback search in baseline directly
    if (BASELINE_PROPERTIES[idOrSlug]) return BASELINE_PROPERTIES[idOrSlug];
    const foundBase = Object.values(BASELINE_PROPERTIES).find(p => p.slug === idOrSlug || p.id === idOrSlug);
    return foundBase || null;
  }

  // Save single property modifications
  async function saveShowcaseProperty(id, data) {
    let custom = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) custom = JSON.parse(raw);
    } catch (e) {}

    const existing = getShowcaseProperty(id) || {};
    const updated = Object.assign({}, existing, data, { updatedAt: new Date().toISOString() });
    custom[id] = updated;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }

    // Also persist to Supabase rooms table if available
    if (window.sb) {
      try {
        const payload = {
          rent_per_night: updated.base_price || null,
          max_guests: updated.max_guests || null,
          map_link: updated.map_link || null,
          floor_info: JSON.stringify({
            photos: updated.photos || {},
            video_url: updated.video_url || '',
            amenities: updated.amenities || [],
            landmarks: updated.landmarks || [],
            bedrooms: updated.bedrooms || 3,
            bathrooms: updated.bathrooms || 3,
            beds: updated.beds || '',
            airbnb_price: updated.airbnb_price || null,
            map_embed: updated.map_embed || ''
          })
        };
        await window.sb.from('rooms').update(payload).eq('room_id', id);
      } catch (err) {
        console.warn('Supabase rooms sync warning:', err);
      }
    }

    return updated;
  }

  // Fetch dynamic sync from Supabase rooms table
  async function syncShowcaseFromDatabase() {
    if (!window.sb) return;
    try {
      const { data: rooms, error } = await window.sb.from('rooms').select('*');
      if (error || !rooms) return;

      let custom = {};
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) custom = JSON.parse(raw);
      } catch (e) {}

      let hasChanges = false;
      rooms.forEach(r => {
        if (!r.room_id) return;
        let info = {};
        if (r.floor_info) {
          try {
            info = typeof r.floor_info === 'string' ? JSON.parse(r.floor_info) : r.floor_info;
          } catch (e) {}
        }

        const updates = {};
        if (r.rent_per_night) updates.base_price = Number(r.rent_per_night);
        if (r.max_guests) updates.max_guests = Number(r.max_guests);
        if (r.map_link) updates.map_link = r.map_link;
        if (info.photos) updates.photos = info.photos;
        if (info.video_url) updates.video_url = info.video_url;
        if (info.amenities) updates.amenities = info.amenities;
        if (info.bedrooms) updates.bedrooms = info.bedrooms;
        if (info.bathrooms) updates.bathrooms = info.bathrooms;
        if (info.beds) updates.beds = info.beds;
        if (info.airbnb_price) updates.airbnb_price = info.airbnb_price;
        if (info.map_embed) updates.map_embed = info.map_embed;

        if (Object.keys(updates).length > 0) {
          custom[r.room_id] = Object.assign({}, BASELINE_PROPERTIES[r.room_id] || {}, custom[r.room_id] || {}, updates);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
      }
    } catch (e) {
      console.warn('syncShowcaseFromDatabase error:', e);
    }
  }

  // Expose API globally
  window.ShowcaseData = {
    getProperties: getShowcaseProperties,
    getProperty: getShowcaseProperty,
    saveProperty: saveShowcaseProperty,
    syncFromDatabase: syncShowcaseFromDatabase,
    BASELINE: BASELINE_PROPERTIES
  };

})(window);
"@)

[System.IO.File]::WriteAllText('js\showcase-data.js', $sb.ToString(), [System.Text.Encoding]::UTF8)
Write-Host "SUCCESS: Rebuilt js/showcase-data.js with all 17 properties and room categories!"
