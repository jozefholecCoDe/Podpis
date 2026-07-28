# Nudzove vypnutie aplikacie Podpis.
# Pouzije sa vtedy, ked bolo hlavne okno zatvorene krizikom a nieco ostalo bezat.

$ErrorActionPreference = "SilentlyContinue"
$pidFile = Join-Path $env:TEMP "podpis-pids.txt"
$stopped = 0

function Stop-Tree($processId) {
    if (-not $processId) { return $false }
    $running = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if (-not $running) { return $false }
    & taskkill.exe /PID $processId /T /F 2>&1 | Out-Null
    return $true
}

Clear-Host
Write-Host ""
Write-Host "  Vypinam aplikaciu Podpis..." -ForegroundColor Cyan
Write-Host ""

# 1) Procesy, ktore si zapisal spustaci skript.
if (Test-Path $pidFile) {
    foreach ($line in Get-Content $pidFile) {
        $processId = 0
        if ([int]::TryParse($line.Trim(), [ref]$processId)) {
            if (Stop-Tree $processId) { $stopped++ }
        }
    }
    Remove-Item $pidFile -ErrorAction SilentlyContinue
}

# 2) Poistka: cokolvek, co po nich ostalo bezat.
foreach ($process in (Get-Process cloudflared -ErrorAction SilentlyContinue)) {
    if (Stop-Tree $process.Id) { $stopped++ }
}
$nextProcesses = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*next*" }
foreach ($process in $nextProcesses) {
    if (Stop-Tree $process.ProcessId) { $stopped++ }
}

if ($stopped -gt 0) {
    Write-Host "  Hotovo, stranka je vypnuta." -ForegroundColor Green
} else {
    Write-Host "  Nic nebezalo, vsetko je uz vypnute." -ForegroundColor Gray
}
Write-Host ""
Start-Sleep -Seconds 2
