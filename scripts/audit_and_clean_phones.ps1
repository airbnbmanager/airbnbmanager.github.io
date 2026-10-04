$key = "sb_publishable_ZgssvBczAg9TPv4ihN8IfQ_FPcEnq1F"
$headers = @{
    "apikey"        = $key
    "Authorization" = "Bearer $key"
}

# Fetch all records
$allRecords = @()
$offset = 0
$pageSize = 1000

while ($true) {
    $url = "https://vxxmigdzimnrbbmkjzoa.supabase.co/rest/v1/guest_register?select=booking_id,guest_name,phone&order=booking_id.asc&offset=$offset&limit=$pageSize"
    $batch = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    if ($null -eq $batch -or $batch.Count -eq 0) {
        break
    }
    $allRecords += $batch
    if ($batch.Count -lt $pageSize) {
        break
    }
    $offset += $pageSize
}

Write-Host "Total records in guest_register: $($allRecords.Count)"

$needFix = @()
$empty = 0
$clean = 0

foreach ($r in $allRecords) {
    $raw = $r.phone
    if ([string]::IsNullOrWhiteSpace($raw)) {
        $empty++
        continue
    }

    $str = $raw.ToString().Trim()
    $digits = $str -replace '\D', ''
    
    # Strip country code / leading zeros
    $cleaned = $digits
    if ($cleaned.Length -eq 12 -and $cleaned.StartsWith("91")) {
        $cleaned = $cleaned.Substring(2)
    } elseif ($cleaned.Length -eq 13 -and $cleaned.StartsWith("091")) {
        $cleaned = $cleaned.Substring(3)
    } elseif ($cleaned.Length -eq 11 -and $cleaned.StartsWith("0")) {
        $cleaned = $cleaned.Substring(1)
    }

    # Check if raw was dirty
    $hasPlus91 = $str.StartsWith("+91")
    $has0091 = $str.StartsWith("0091")
    $hasSpaces = $str.Contains(" ")
    $hasDashes = $str.Contains("-")
    $hasDots = $str.Contains(".")
    $isDirty = ($str -ne $cleaned) -or $hasSpaces -or $hasDashes -or $hasPlus91 -or $has0091

    if ($isDirty) {
        $needFix += [PSCustomObject]@{
            BookingId = $r.booking_id
            GuestName = $r.guest_name
            Raw       = $str
            Cleaned   = $cleaned
            Valid10   = ($cleaned.Length -eq 10)
        }
    } else {
        $clean++
    }
}

Write-Host "Clean count: $clean"
Write-Host "Empty count: $empty"
Write-Host "Issues count: $($needFix.Count)"
Write-Host ""
Write-Host "=== First 30 Issues Found ==="
$needFix | Select-Object -First 30 | Format-Table -AutoSize

# Export all issues to JSON for safe inspection
$needFix | ConvertTo-Json -Depth 5 | Out-File -FilePath "c:\airbnbmanager.github.io\scripts\issues_found.json" -Encoding utf8
Write-Host "Saved all $($needFix.Count) issues to c:\airbnbmanager.github.io\scripts\issues_found.json"
