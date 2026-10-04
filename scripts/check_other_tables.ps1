$key = "sb_publishable_ZgssvBczAg9TPv4ihN8IfQ_FPcEnq1F"
$headers = @{
    "apikey"        = $key
    "Authorization" = "Bearer $key"
}

$tables = @("leads", "guest_profiles", "guests", "inquiries", "staff", "users", "bookings")
foreach ($t in $tables) {
    try {
        $url = "https://vxxmigdzimnrbbmkjzoa.supabase.co/rest/v1/$t?select=*&limit=1"
        $r = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        Write-Host "Table '$t' EXISTS! Count sample: $($r.Count)"
        if ($r.Count -gt 0) {
            $r[0].PSObject.Properties.Name | ForEach-Object { Write-Host "   - $_" }
        }
    } catch {
        # Table might not exist or no permission
        Write-Host "Table '$t' not accessible or doesn't exist"
    }
}
