$allProps = @(
    @{ code = 'VIL-105'; id = '1592729918855637425'; name = 'The Yellow House'; slug = 'the-yellow-house' },
    @{ code = 'VIL-103'; id = '1592729438969718723'; name = 'The Pink House'; slug = 'the-pink-house' },
    @{ code = 'GOM-102'; id = '1676840617430941240'; name = 'Black Beauty'; slug = 'black-beauty' },
    @{ code = 'GOM-201'; id = '1655969170448425308'; name = 'The Dark Blue'; slug = 'the-dark-blue' },
    @{ code = 'GOM-501'; id = '1718385679817913835'; name = 'Starlight Blue PentHouse'; slug = 'starlight-blue-penthouse' },
    @{ code = 'VIL-101'; id = '1721732716374002170'; name = 'Gomti Grand Villa'; slug = 'gomti-grand-villa' },
    @{ code = 'VIL-102'; id = '1718315215180636685'; name = 'Royal White House'; slug = 'royal-white-house' },
    @{ code = 'VIL-104'; id = '1593461780265937816'; name = 'The Green House'; slug = 'the-green-house' },
    @{ code = 'LUL-402'; id = '1606514664948608755'; name = 'Celebrity Garden'; slug = 'celebrity-garden' },
    @{ code = 'GOM-401'; id = '1723434530455939144'; name = 'The Nawabi Stay'; slug = 'the-nawabi-stay' },
    @{ code = 'GOM-101'; id = '1654261872286835347'; name = 'RedRose Palace'; slug = 'redrose-palace' },
    @{ code = 'GOM-202'; id = '1660898784168880636'; name = 'The Brown'; slug = 'the-brown' },
    @{ code = 'GOM-301'; id = '1679155811558485410'; name = 'The Light Green'; slug = 'the-light-green' },
    @{ code = 'GOM-302'; id = '1679190202218939181'; name = 'The Unique'; slug = 'the-unique' },
    @{ code = 'VIL-106'; id = '1739254108962193705'; name = 'Green Forest View'; slug = 'green-forest' },
    @{ code = 'VIL-107'; id = '1727830063287100082'; name = 'The Velvet House'; slug = 'the-velvet-house' },
    @{ code = 'VIL-108'; id = '1756799939825259443'; name = 'Pink Paradise Villa'; slug = 'pink-paradise' }
)

$headers = @{
    'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

$results = [ordered]@{}

foreach ($p in $allProps) {
    Write-Output "Fetching $($p.code): $($p.name) (Airbnb ID: $($p.id))..."
    $url = "https://www.airbnb.co.in/rooms/$($p.id)"
    $success = $false
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        try {
            $resp = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing -TimeoutSec 20
            $html = $resp.Content
            $matches = [regex]::Matches($html, '"accessibilityLabel":"([^"]+)","baseUrl":"([^"]+)"')
            
            $rawCategories = [ordered]@{}
            $allPhotos = [System.Collections.Generic.List[string]]::new()
            
            foreach ($m in $matches) {
                $label = $m.Groups[1].Value
                $imgUrl = $m.Groups[2].Value
                
                # Must be a photo of this listing
                if ($imgUrl -notmatch "Hosting-$($p.id)") { continue }
                # Clean URL (strip query params for clean base or keep original)
                $cleanUrl = $imgUrl.Split('?')[0]
                
                if (-not $allPhotos.Contains($cleanUrl)) {
                    $allPhotos.Add($cleanUrl)
                }
                
                $catName = ($label -replace '\s+image\s+\d+.*$', '').Trim()
                if (-not $rawCategories.Contains($catName)) {
                    $rawCategories[$catName] = [System.Collections.Generic.List[string]]::new()
                }
                if (-not $rawCategories[$catName].Contains($cleanUrl)) {
                    $rawCategories[$catName].Add($cleanUrl)
                }
            }
            
            # Map into standard UI categories:
            # 1. living_hall: Living room, Dining area, Hall
            # 2. bedrooms: Bedroom 1, Bedroom 2, Bedroom 3, Bedroom 4, Bedroom 5, etc.
            # 3. bathrooms: Full bathroom 1, Full bathroom 2, Full bathroom 3, Half bath, etc.
            # 4. kitchen: Full kitchen, Kitchen, Kitchenette
            # 5. balcony: Balcony, Patio, Terrace, Exterior, Additional photos, Views, Garden, Outdoors, Garage
            
            $livingList = [System.Collections.Generic.List[string]]::new()
            $bedroomList = [System.Collections.Generic.List[string]]::new()
            $bathroomList = [System.Collections.Generic.List[string]]::new()
            $kitchenList = [System.Collections.Generic.List[string]]::new()
            $balconyList = [System.Collections.Generic.List[string]]::new()
            
            foreach ($k in $rawCategories.Keys) {
                $kLower = $k.ToLower()
                $photoList = $rawCategories[$k]
                
                if ($kLower -match 'bedroom|bed') {
                    foreach ($u in $photoList) { if (-not $bedroomList.Contains($u)) { $bedroomList.Add($u) } }
                } elseif ($kLower -match 'bathroom|bath|toilet|washroom') {
                    foreach ($u in $photoList) { if (-not $bathroomList.Contains($u)) { $bathroomList.Add($u) } }
                } elseif ($kLower -match 'kitchen|cooking') {
                    foreach ($u in $photoList) { if (-not $kitchenList.Contains($u)) { $kitchenList.Add($u) } }
                } elseif ($kLower -match 'living|dining|hall|drawing|lounge|seating') {
                    foreach ($u in $photoList) { if (-not $livingList.Contains($u)) { $livingList.Add($u) } }
                } elseif ($kLower -match 'balcony|patio|terrace|exterior|outdoor|garden|view|additional|garage|laundry') {
                    foreach ($u in $photoList) { if (-not $balconyList.Contains($u)) { $balconyList.Add($u) } }
                } else {
                    # Default uncategorized goes to balcony/views/exterior
                    foreach ($u in $photoList) { if (-not $balconyList.Contains($u)) { $balconyList.Add($u) } }
                }
            }
            
            # Fallback if page had photos but accessibilityLabel wasn't matching all
            if ($allPhotos.Count -eq 0) {
                $genericRegex = [regex]::Matches($html, "https://a0\.muscache\.com/im/pictures/hosting/Hosting-$($p.id)/original/[a-f0-9\-]+\.(?:jpeg|jpg|png|webp)")
                foreach ($gm in $genericRegex) {
                    $u = $gm.Value
                    if (-not $allPhotos.Contains($u)) { $allPhotos.Add($u) }
                }
                Write-Output "   Used generic regex: found $($allPhotos.Count) photos"
            }
            
            $results[$p.code] = [ordered]@{
                code = $p.code
                name = $p.name
                slug = $p.slug
                airbnbId = $p.id
                totalPhotos = $allPhotos.Count
                rawCategories = $rawCategories
                standardCategories = [ordered]@{
                    living_hall = $livingList
                    bedrooms = $bedroomList
                    bathrooms = $bathroomList
                    kitchen = $kitchenList
                    balcony = $balconyList
                    all = $allPhotos
                }
            }
            
            Write-Output "   OK! Total: $($allPhotos.Count) | Living: $($livingList.Count) | Beds: $($bedroomList.Count) | Baths: $($bathroomList.Count) | Kitchen: $($kitchenList.Count) | Balcony/Ext: $($balconyList.Count)"
            $success = $true
            break
        } catch {
            Write-Output "   Attempt $attempt failed: $_. Retrying in 2s..."
            Start-Sleep -Seconds 2
        }
    }
    if (-not $success) {
        Write-Output "   FAILED to fetch $($p.name) after 3 attempts!"
    }
    # Small pause to be polite
    Start-Sleep -Milliseconds 600
}

$jsonOutput = $results | ConvertTo-Json -Depth 6
$jsonOutput | Out-File -FilePath "scripts/airbnb_categorized_photos.json" -Encoding utf8
Write-Output "Saved all results to scripts/airbnb_categorized_photos.json"
