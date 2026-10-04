$jsonContent = Get-Content 'scripts\airbnb_categorized_photos.json' -Raw | ConvertFrom-Json
$jsonContent.PSObject.Properties | ForEach-Object {
    $prop = $_.Value
    Write-Output "$($_.Name) -> slug: $($prop.slug), photos: $($prop.totalPhotos)"
}
