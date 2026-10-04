$key = "sb_publishable_ZgssvBczAg9TPv4ihN8IfQ_FPcEnq1F"
$headers = @{
    "apikey"        = $key
    "Authorization" = "Bearer $key"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=representation"
}

# Test update on BK178778234975966 (Sharad Srivastava whose phone was "+91 99100 11669")
$url = "https://vxxmigdzimnrbbmkjzoa.supabase.co/rest/v1/guest_register?booking_id=eq.BK178778234975966"
$body = '{"phone":"9910011669"}'

try {
    $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Patch -Body $body
    Write-Host "UPDATE SUCCESSFUL!"
    $res | Format-List booking_id, guest_name, phone
} catch {
    Write-Host "UPDATE FAILED: $($_.Exception.Message)"
    if ($_.ErrorDetails) {
        Write-Host "Details: $($_.ErrorDetails.Message)"
    }
}
