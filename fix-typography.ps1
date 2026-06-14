$files = Get-ChildItem -Path "src" -Recurse -Filter "*.jsx"
foreach ($file in $files) {
    $content = Get-Content $file.PSPath -Raw
    $newContent = $content `
        -replace 'rounded-m3-card', 'rounded-[24px]' `
        -replace 'rounded-card', 'rounded-[24px]' `
        -replace 'text-\[28px\] font-extrabold text-on-surface( leading-tight)?', 'm3-display-md' `
        -replace 'text-xs font-bold tracking-widest text-on-surface-variant', 'm3-label' `
        -replace 'text-xl font-bold text-on-surface', 'm3-title-lg' `
        -replace 'text-xl font-extrabold text-on-surface', 'm3-title-lg'
    
    if ($content -cne $newContent) {
        Set-Content -Path $file.PSPath -Value $newContent -NoNewline
        Write-Host "Fixed Typography in $($file.Name)"
    }
}
