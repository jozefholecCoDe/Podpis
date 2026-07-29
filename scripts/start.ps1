# Spusti aplikaciu Podpis: tunel + server + otvorenie prehliadaca.
# Spusta sa dvojklikom na "Spustit-Podpis.bat" v hlavnom priecinku projektu.

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# Starsie Windows PowerShell defaultuje na TLS 1.0, ktore Cloudflare odmieta -
# bez tohto by overenie verejnej adresy zlyhalo aj vtedy, ked realne funguje.
try {
    [Net.ServicePointManager]::SecurityProtocol =
        [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls11
} catch {
    # starsi .NET tieto hodnoty nepozna, pokracujeme s predvolenym nastavenim
}

$Host.UI.RawUI.WindowTitle = "Podpis dokumentov - server bezi"
$pidFile = Join-Path $env:TEMP "podpis-pids.txt"
$tunnelLog = Join-Path $env:TEMP "podpis-tunnel.log"
$serverLog = Join-Path $env:TEMP "podpis-server.log"

$tunnelProcess = $null
$serverProcess = $null

function Show-Step($text) {
    Write-Host ""
    Write-Host "  $text" -ForegroundColor Cyan
}

function Show-Fail($text) {
    Write-Host ""
    Write-Host "  CHYBA: $text" -ForegroundColor Red
    Write-Host ""
    Read-Host "  Stlac Enter pre zatvorenie okna"
    exit 1
}

function Stop-Tree($process) {
    if ($null -eq $process) { return }
    try {
        & taskkill.exe /PID $process.Id /T /F 2>&1 | Out-Null
    } catch {
        # proces uz medzitym skoncil
    }
}

<#
    Spusti cloudflared a pocka na verejnu adresu. Vrati adresu, alebo $null,
    ak sa spojenie nepodarilo nadviazat. Bezici proces si odklada do
    $script:tunnelProcess, aby sa dal na konci korektne ukoncit.
#>
function Connect-Tunnel($protocol) {
    Stop-Tree $script:tunnelProcess
    $script:tunnelProcess = $null
    Remove-Item $tunnelLog -ErrorAction SilentlyContinue

    $arguments = @("tunnel", "--url", "http://localhost:3000")
    if ($protocol) { $arguments += @("--protocol", $protocol) }

    $script:tunnelProcess = Start-Process -FilePath "cloudflared" `
        -ArgumentList $arguments `
        -RedirectStandardError $tunnelLog `
        -RedirectStandardOutput "$tunnelLog.out" `
        -WindowStyle Hidden -PassThru

    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Milliseconds 500
        $log = Get-Content $tunnelLog -Raw -ErrorAction SilentlyContinue
        if ($log -and $log -match "https://[-a-z0-9]+\.trycloudflare\.com") {
            return $Matches[0]
        }
        if ($script:tunnelProcess.HasExited) { return $null }
    }
    return $null
}

Clear-Host
Write-Host ""
Write-Host "  ============================================" -ForegroundColor DarkGray
Write-Host "     PODPIS DOKUMENTOV" -ForegroundColor White
Write-Host "  ============================================" -ForegroundColor DarkGray

try {
    # --- Kontrola prostredia ---------------------------------------------
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Show-Fail "Nie je nainstalovany Node.js. Stiahni ho z https://nodejs.org (verzia LTS)."
    }
    if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
        Show-Fail "Nie je nainstalovany cloudflared. Spusti: winget install Cloudflare.cloudflared"
    }
    if (-not (Test-Path ".env.local")) {
        Show-Fail "Chyba subor .env.local s nastavenim emailu. Skopiruj .env.example na .env.local a vypln udaje."
    }

    $portBusy = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    if ($portBusy) {
        Show-Fail "Aplikacia uz zrejme bezi (port 3000 je obsadeny). Najprv spusti 'Zastavit-Podpis.bat'."
    }

    if (-not (Test-Path "node_modules")) {
        Show-Step "Prva instalacia, moze to trvat aj dve minuty..."
        & npm.cmd install --silent
        if ($LASTEXITCODE -ne 0) { Show-Fail "Instalacia balickov zlyhala." }
    }

    # --- Priprava aplikacie -----------------------------------------------
    # Bezi sa v produkcnom rezime (rychlejsi a bez vyvojovych obmedzeni).
    # Zostavuje sa len vtedy, ked sa od posledneho zostavenia nieco zmenilo.
    $buildId = Join-Path $projectRoot ".next\BUILD_ID"
    $needsBuild = $true
    if (Test-Path $buildId) {
        $builtAt = (Get-Item $buildId).LastWriteTimeUtc
        $watched = @()
        foreach ($name in @("app", "components", "lib", "public")) {
            $full = Join-Path $projectRoot $name
            if (Test-Path $full) {
                $watched += Get-ChildItem -Path $full -Recurse -File -ErrorAction SilentlyContinue
            }
        }
        foreach ($name in @("package.json", "next.config.ts")) {
            $full = Join-Path $projectRoot $name
            if (Test-Path $full) { $watched += Get-Item $full }
        }
        $newest = ($watched | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1)
        if ($newest -and $newest.LastWriteTimeUtc -le $builtAt) { $needsBuild = $false }
    }
    if ($needsBuild) {
        Show-Step "Pripravujem aplikaciu, chvilu to potrva (len po aktualizacii)..."
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { Show-Fail "Priprava aplikacie zlyhala." }
    }

    # --- Tunel ------------------------------------------------------------
    # Tunel sa spusta ako prvy: verejna adresa musi byt zapisana do .env.local
    # skor, nez sa nastartuje server, aby odkazy v emailoch sedeli.
    Show-Step "Pripajam sa na internet..."
    $publicUrl = Connect-Tunnel $null
    if (-not $publicUrl) {
        # Cloudflared standardne pouziva QUIC cez UDP, ktore firewally na
        # firemnych a verejnych sietach casto zahadzuju. HTTP/2 cez TCP 443
        # prejde aj tam.
        Show-Step "Nepodarilo sa, skusam nahradne pripojenie..."
        $publicUrl = Connect-Tunnel "http2"
    }
    if (-not $publicUrl) {
        $tail = (Get-Content $tunnelLog -Tail 6 -ErrorAction SilentlyContinue) -join "`n  "
        Show-Fail @"
Nepodarilo sa vytvorit verejnu adresu.
  Tato siet zrejme blokuje spojenie na Cloudflare.

  Posledne riadky z logu:
  $tail

  Cely log: $tunnelLog
"@
    }

    # --- Zapis adresy do .env.local ---------------------------------------
    $envPath = Join-Path $projectRoot ".env.local"
    $envLines = @(Get-Content $envPath)
    $replaced = $false
    $newEnv = @(
        foreach ($line in $envLines) {
            if ($line -match '^\s*APP_BASE_URL\s*=') {
                $replaced = $true
                "APP_BASE_URL=$publicUrl"
            } else {
                $line
            }
        }
    )
    if (-not $replaced) { $newEnv += "APP_BASE_URL=$publicUrl" }
    # Zapis bez BOM - inak by sa prvy riadok (SMTP_HOST) nemusel spravne nacitat.
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllLines($envPath, [string[]]$newEnv, $utf8NoBom)

    # --- Server -----------------------------------------------------------
    Show-Step "Spustam stranku..."
    Remove-Item $serverLog -ErrorAction SilentlyContinue
    $serverProcess = Start-Process -FilePath "npm.cmd" `
        -ArgumentList "start" `
        -RedirectStandardOutput $serverLog `
        -RedirectStandardError "$serverLog.err" `
        -WindowStyle Hidden -PassThru

    "$($tunnelProcess.Id)`n$($serverProcess.Id)" | Set-Content -Path $pidFile -Encoding ASCII

    $ready = $false
    for ($i = 0; $i -lt 120; $i++) {
        Start-Sleep -Milliseconds 500
        if ($serverProcess.HasExited) { break }
        try {
            Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 | Out-Null
            $ready = $true
            break
        } catch {
            # server sa este len startuje
        }
    }
    if (-not $ready) {
        Show-Fail "Stranku sa nepodarilo spustit. Podrobnosti v subore: $serverLog"
    }

    # --- Cakanie na dostupnost verejnej adresy ----------------------------
    # Cloudflare adresu ohlasi skor, nez ju rozposle do DNS. Bez tohto cakania
    # by sa prehliadac otvoril na adrese, ktora este neexistuje.
    Show-Step "Overujem verejnu adresu, moze to trvat aj pol minuty..."
    $publicReady = $false
    $lastError = ""
    for ($i = 0; $i -lt 30; $i++) {
        try {
            Invoke-WebRequest -Uri $publicUrl -UseBasicParsing -TimeoutSec 5 | Out-Null
            $publicReady = $true
            break
        } catch {
            # Aj chybova HTTP odpoved (napr. 502, kym sa tunel dopaja) znamena,
            # ze adresa uz existuje - vtedy staci pockat dlhsie.
            $lastError = $_.Exception.Message
            if ($tunnelProcess.HasExited) {
                $lastError = "Spojenie s Cloudflare sa preruslo. Podrobnosti: $tunnelLog"
                break
            }
            Start-Sleep -Seconds 2
        }
    }

    Clear-Host
    Write-Host ""
    if ($publicReady) {
        Start-Process $publicUrl
        Write-Host "  ============================================" -ForegroundColor DarkGray
        Write-Host "     STRANKA BEZI" -ForegroundColor Green
        Write-Host "  ============================================" -ForegroundColor DarkGray
        Write-Host ""
        Write-Host "  Otvorila sa v prehliadaci. Adresa:" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  $publicUrl" -ForegroundColor White
        Write-Host ""
        Write-Host "  Tuto adresu mozes poslat aj na iny pocitac" -ForegroundColor Gray
        Write-Host "  alebo otvorit v mobile." -ForegroundColor Gray
    } else {
        Start-Process "http://localhost:3000"
        Write-Host "  ============================================" -ForegroundColor DarkGray
        Write-Host "     STRANKA BEZI - ale iba na tomto pocitaci" -ForegroundColor Yellow
        Write-Host "  ============================================" -ForegroundColor DarkGray
        Write-Host ""
        Write-Host "  V prehliadaci sa otvorila miestna adresa:" -ForegroundColor Gray
        Write-Host "  http://localhost:3000" -ForegroundColor White
        Write-Host ""
        Write-Host "  Verejna adresa zatial neodpoveda:" -ForegroundColor Gray
        Write-Host "  $publicUrl" -ForegroundColor White
        Write-Host ""
        Write-Host "  Dovod:" -ForegroundColor Gray
        Write-Host "  $lastError" -ForegroundColor DarkYellow
        Write-Host ""
        Write-Host "  Skus adresu otvorit rucne - niekedy sa rozbehne" -ForegroundColor Gray
        Write-Host "  az po minute. Ak ani potom nejde, blokuje ju" -ForegroundColor Gray
        Write-Host "  zrejme tvoj poskytovatel internetu." -ForegroundColor Gray
        Write-Host "  POZOR: odkazy v emailoch pouzivaju verejnu adresu," -ForegroundColor Yellow
        Write-Host "  takze kym nefunguje, nefunguju ani ony." -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "  --------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  TOTO OKNO NEZATVARAJ, kym pracujes." -ForegroundColor Yellow
    Write-Host "  Na konci stlac Enter - stranka sa vypne." -ForegroundColor Yellow
    Write-Host "  --------------------------------------------" -ForegroundColor DarkGray
    Write-Host ""
    Read-Host "  Stlac Enter pre vypnutie"
}
finally {
    Write-Host ""
    Write-Host "  Vypinam..." -ForegroundColor Gray
    Stop-Tree $serverProcess
    Stop-Tree $tunnelProcess
    Remove-Item $pidFile -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}
