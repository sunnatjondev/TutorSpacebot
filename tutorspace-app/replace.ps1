$files = Get-ChildItem -Path "src" -Recurse -Filter "*.jsx"
foreach ($file in $files) {
    $content = Get-Content $file.PSPath -Raw
    $newContent = $content `
        -replace '\bbtn-primary\b', 'm3-btn-filled' `
        -replace '\bbtn-secondary\b', 'm3-btn-tonal' `
        -replace '\bbtn-outline\b', 'm3-btn-outline' `
        -replace '\bbtn-text\b', 'm3-btn-text' `
        -replace '\bcard\b(?!\-)', 'm3-card' `
        -replace '\bcard-interactive\b', 'm3-card-interactive' `
        -replace '\binput-field\b', 'm3-input' `
        -replace '\bselect-field\b', 'm3-select' `
        -replace '\bfab\b', 'm3-fab' `
        -replace '\bsection-title\b', 'm3-title-lg'
    
    if ($content -cne $newContent) {
        Set-Content -Path $file.PSPath -Value $newContent -NoNewline
        Write-Host "Updated $($file.Name)"
    }
}
