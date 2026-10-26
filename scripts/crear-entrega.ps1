param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Z0-9_]+_LAB_WEBSOCKETS\.zip$')]
    [string]$NombreArchivo
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$zipPath = Join-Path $projectRoot $NombreArchivo
$sourceFiles = @()
foreach ($folder in @('public', 'server', 'tests', 'scripts')) {
    $sourceFiles += Get-ChildItem -LiteralPath (Join-Path $projectRoot $folder) -File -Recurse
}
foreach ($name in @('package.json', 'package-lock.json', 'README.md', '.gitignore')) {
    $sourceFiles += Get-Item -LiteralPath (Join-Path $projectRoot $name) -Force
}

# Lista explícita de archivos del proyecto: nunca empaquetar dependencias o claves.
$archive = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in $sourceFiles | Sort-Object FullName) {
        $entryName = $file.FullName.Substring($projectRoot.Length + 1).Replace('\', '/')
        if ($entryName -match '(^|/)(node_modules|\.data|\.git)(/|$)|(^|/)\.env($|\.)|\.(zip|log)$') {
            throw "Archivo excluido de la entrega: $entryName"
        }
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $entryName) | Out-Null
    }
} finally {
    $archive.Dispose()
}
Write-Output "ZIP creado: $zipPath"
