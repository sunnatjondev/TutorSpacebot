$cssFile = "src\index.css"
$missingCSS = @"

/* Restored Missing Classes */
.chip-row {
  @apply flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 hide-scrollbar;
}
.chip {
  @apply px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer border border-outline-variant/30;
}
.chip-active {
  @apply bg-primary text-on-primary border-primary;
}

/* Progress Bar */
.progress-bar {
  @apply w-full h-2 rounded-full bg-surface-highest overflow-hidden;
}
.progress-fill {
  @apply h-full bg-primary transition-all duration-500 ease-out;
}

/* Toggles */
.toggle {
  @apply relative inline-flex h-8 w-14 items-center rounded-full transition-colors cursor-pointer;
}
.toggle-knob {
  @apply inline-block h-6 w-6 transform rounded-full bg-on-primary transition-transform shadow-m3-elevation-1;
}

"@

$content = Get-Content $cssFile -Raw
$content = $content -replace "animation: scaleIn 0.5s cubic-bezier\(0.34, 1.56, 0.64, 1\) forwards;", "@apply animate-scale-in; animation-fill-mode: forwards;"
$content += $missingCSS

Set-Content -Path $cssFile -Value $content -NoNewline
Write-Host "Fixed CSS"
