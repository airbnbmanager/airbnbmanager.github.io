$url = "https://vxxmigdzimnrbbmkjzoa.supabase.co/rest/v1/guest_register?select=*&limit=3"
$key = "sb_publishable_ZgssvBczAg9TPv4ihN8IfQ_FPcEnq1F"
$headers = @{
    "apikey"        = $key
    "Authorization" = "Bearer $key"
}
$r = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
if ($r.Count -gt 0) {
    Write-Host "=== Column Names ==="
    $r[0].PSObject.Properties.Name | ForEach-Object { Write-Host $_ }
    Write-Host ""
    Write-Host "=== Sample Record ==="
    $r[0] | Format-List
}
