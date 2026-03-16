$rid = [Guid]::NewGuid().ToString('N').Substring(0,8)
$fakeOut = "$env:TEMP\re_$rid.txt"
"Emulation Test" | Out-File $fakeOut -Force
$cmd = 'Invoke-Command -ComputerName TESTHOST -ScriptBlock { Set-ItemProperty -Path "HKLM:\System\CurrentControlSet\Control\Terminal Server" -Name "DenyTSConnections" -Value 0 }'
$process = Start-Process powershell.exe `
    -ArgumentList "-NoProfile -Command `"`$null = `$env:TEMP; $cmd; 'benign_emulation' | Out-File '$fakeOut' -Append`"" `
    -WindowStyle Hidden -Wait -PassThru
Write-Output "RDP emulation completed (Exit code: $($process.ExitCode))"
Remove-Item $fakeOut -Force -ErrorAction SilentlyContinue
