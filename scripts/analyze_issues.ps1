$issues = Get-Content "c:\airbnbmanager.github.io\scripts\issues_found.json" -Raw | ConvertFrom-Json

$valid10 = $issues | Where-Object { $_.Valid10 -eq $true }
$invalid = $issues | Where-Object { $_.Valid10 -eq $false }

Write-Host "Total issues: $($issues.Count)"
Write-Host "Can be cleaned to 10-digit Indian mobile: $($valid10.Count)"
Write-Host "Other cases (masked, foreign, invalid length): $($invalid.Count)"
Write-Host ""
Write-Host "=== Details of all $($invalid.Count) Other cases ==="
$invalid | Format-Table BookingId, GuestName, Raw, Cleaned -AutoSize
