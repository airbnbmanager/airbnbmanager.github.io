$key = "sb_publishable_ZgssvBczAg9TPv4ihN8IfQ_FPcEnq1F"
$headers = @{
    "apikey"        = $key
    "Authorization" = "Bearer $key"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=representation"
}

# 1. Fetch all records
Write-Host "Fetching all records from guest_register..."
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

Write-Host "Fetched $($allRecords.Count) total records."

$toUpdate = @()

foreach ($r in $allRecords) {
    $raw = $r.phone
    if ([string]::IsNullOrWhiteSpace($raw)) { continue }

    $str = $raw.ToString().Trim()

    # Skip masked numbers like "+91 XXXXX 7164" or "9XXXXXXXXX"
    if ($str -match '[xX]') { continue }

    # Extract all digits
    $digits = $str -replace '\D', ''

    # Handle standard Indian prefixes
    $cleaned = $digits
    if ($cleaned.Length -eq 12 -and $cleaned.StartsWith("91")) {
        $cleaned = $cleaned.Substring(2)
    } elseif ($cleaned.Length -eq 13 -and $cleaned.StartsWith("091")) {
        $cleaned = $cleaned.Substring(3)
    } elseif ($cleaned.Length -eq 11 -and $cleaned.StartsWith("0")) {
        $cleaned = $cleaned.Substring(1)
    }

    # Only clean if it results in a valid 10-digit Indian mobile (starts with 6, 7, 8, 9)
    # OR if raw was dirty with +91/spaces and resulted in a clean 10-digit number
    if ($cleaned.Length -eq 10 -and $cleaned -match '^[6-9]\d{9}$') {
        if ($str -ne $cleaned) {
            $toUpdate += [PSCustomObject]@{
                BookingId = $r.booking_id
                GuestName = $r.guest_name
                OldPhone  = $str
                NewPhone  = $cleaned
            }
        }
    }
}

Write-Host "Records eligible for clean 10-digit phone update: $($toUpdate.Count)"

# Log before running
$logFile = "c:\airbnbmanager.github.io\scripts\cleanup_log_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$toUpdate | ConvertTo-Json -Depth 5 | Out-File -FilePath $logFile -Encoding utf8
Write-Host "Pre-update log saved to $logFile"

# Perform the updates
$successCount = 0
$failCount = 0

foreach ($item in $toUpdate) {
    $bkId = [uri]::EscapeDataString($item.BookingId)
    $patchUrl = "https://vxxmigdzimnrbbmkjzoa.supabase.co/rest/v1/guest_register?booking_id=eq.$bkId"
    $body = @{ phone = $item.NewPhone } | ConvertTo-Json

    try {
        $res = Invoke-RestMethod -Uri $patchUrl -Headers $headers -Method Patch -Body $body
        $successCount++
        Write-Host "[$successCount/$($toUpdate.Count)] OK: $($item.GuestName) | '$($item.OldPhone)' -> '$($item.NewPhone)'"
    } catch {
        $failCount++
        Write-Host "FAILED for $($item.BookingId): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "================ SUMMARY ================"
Write-Host "Total eligible: $($toUpdate.Count)"
Write-Host "Successfully updated: $successCount"
Write-Host "Failed: $failCount"
Write-Host "========================================="
