param(
    [string]$ScriptsDir,
    [string]$ResultsDir,
    [string]$ManifestPath
)

$ErrorActionPreference = 'Continue'

$manifest = Get-Content $ManifestPath | ConvertFrom-Json

foreach ($scenario in $manifest) {
    $id = $scenario.id
    $scriptFile = Join-Path $ScriptsDir "$id.ps1"
    $resultFile = Join-Path $ResultsDir "$id.json"

    if (!(Test-Path $scriptFile)) {
        @{ scenarioId=$id; status="failed"; message="Script not found"; stdout=""; stderr=""; exitCode=-1; durationMs=0 } |
            ConvertTo-Json | Set-Content -Path $resultFile -Encoding UTF8
        continue
    }

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $stdoutBuf = ''
    $stderrBuf = ''
    $exitCode = 0
    $status = 'completed'

    try {
        $output = & $scriptFile 2>&1
        foreach ($item in $output) {
            if ($item -is [System.Management.Automation.ErrorRecord]) {
                $stderrBuf += $item.ToString() + "`n"
            } else {
                $stdoutBuf += $item.ToString() + "`n"
            }
        }
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
            $exitCode = $LASTEXITCODE
            $status = 'blocked'
        }
    } catch {
        $stderrBuf = $_.Exception.Message
        $exitCode = 1
        $status = 'blocked'
    }

    $sw.Stop()

    @{
        scenarioId = $id
        status = $status
        message = $stdoutBuf.Trim()
        stdout = $stdoutBuf
        stderr = $stderrBuf
        exitCode = $exitCode
        durationMs = $sw.ElapsedMilliseconds
    } | ConvertTo-Json | Set-Content -Path $resultFile -Encoding UTF8
}

# Signal completion
"done" | Set-Content -Path (Join-Path $ResultsDir "_done") -Encoding UTF8
