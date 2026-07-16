$files = Get-ChildItem -Path "src" -Recurse -Filter "*.jsx"
foreach ($file in $files) {
    $content = Get-Content $file.PSPath -Raw
    $newContent = $content `
        -replace 'm3-m3-card', 'm3-card' `
        -replace 'm3-m3-fab', 'm3-fab' `
        -replace 'm3-btn-outline-block', 'inline-block' `
        -replace 'm3-fabsolute', 'absolute' `
        -replace 'm3-card-interactiver', 'page-wrapper' `
        -replace 'm3-selectex-col', 'flex' `
        -replace 'm3-labelruncate', 'm3-label truncate' `
        -replace 'm3-m3-title-lg', 'm3-title-lg'
    
    if ($content -cne $newContent) {
        Set-Content -Path $file.PSPath -Value $newContent -NoNewline
        Write-Host "Cleaned typos in $($file.Name)"
    }
}
