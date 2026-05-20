$secDir = "src\pages\dashboard\security"
$files = Get-ChildItem "$secDir\*.tsx"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $content = $content -replace [regex]::Escape('../../services/api'), '../../../services/api'
    $content = $content -replace [regex]::Escape('../../components/shared/'), '../../../components/shared/'
    $content = $content -replace [regex]::Escape('../../providers/AuthProvider'), '../../../providers/AuthProvider'
    $content = $content -replace [regex]::Escape('../../lib/axios'), '../../../lib/axios'
    Set-Content $file.FullName $content -NoNewline
    Write-Host "Fixed imports in: $($file.Name)"
}
Write-Host "Done."
