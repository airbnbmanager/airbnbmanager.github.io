$key = "sb_publishable_ZgssvBczAg9TPv4ihN8IfQ_FPcEnq1F"
$headers = @{
    "apikey"        = $key
    "Authorization" = "Bearer $key"
}

$bks = @("B1784327127564", "B1784327417451", "B1784327768289", "B1784891036290")
foreach ($b in $bks) {
    $url = "https://vxxmigdzimnrbbmkjzoa.supabase.co/rest/v1/guest_register?booking_id=eq.$b&select=booking_id,guest_name,phone,notes,booking_mode,room_id"
    $r = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    $r | Format-List
}
