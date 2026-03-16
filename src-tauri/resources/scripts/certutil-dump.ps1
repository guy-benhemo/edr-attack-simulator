$rid = [Guid]::NewGuid().ToString('N').Substring(0,8)
$fakeIn = "$env:TEMP\fd_$rid.bin"
"xyz" | Out-File $fakeIn -Encoding ASCII -Force
$hives = "SAM", "SYSTEM", "SECURITY"
$procs = @()
foreach ($hive in $hives) {
    1..3 | ForEach-Object {
        $proc = Start-Process "cmd.exe" `
            -ArgumentList "/c certutil.exe -encode `"$fakeIn`" `"$env:TEMP\config_${hive}_$rid.bin`"" `
            -WindowStyle Hidden -PassThru
        $procs += $proc
    }
}
Start-Sleep -Seconds 2
Write-Output "Spawned $($procs.Count) certutil processes targeting SAM/SYSTEM/SECURITY"
Remove-Item $fakeIn -Force -ErrorAction SilentlyContinue
foreach ($hive in $hives) { Remove-Item "$env:TEMP\config_${hive}_$rid.bin" -Force -ErrorAction SilentlyContinue }
