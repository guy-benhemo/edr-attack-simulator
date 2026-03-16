$prefix = "S1E_$([Guid]::NewGuid().ToString('N').Substring(0,8))"
$tasks = @()

$t1 = "${prefix}_LP"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$t1`" /TR `"cmd.exe /c tasklist /fi `"imagename eq lsass.exe`" /v`" /SC ONCE /ST 23:59 /F" -WindowStyle Hidden -Wait
$tasks += $t1
Start-Sleep -Milliseconds 500

$psCmd = 'Get-Process lsass | Select-Object Id,ProcessName,HandleCount,WorkingSet'
$encoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($psCmd))

$t2 = "${prefix}_EP"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$t2`" /TR `"powershell.exe -EncodedCommand $encoded -NoProfile -WindowStyle Hidden`" /SC ONCE /ST 23:59 /F" -WindowStyle Hidden -Wait
$tasks += $t2
Start-Sleep -Milliseconds 500

$t3 = "${prefix}_MK"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$t3`" /TR `"cmd.exe /c echo privilege::debug sekurlsa::logonpasswords exit`" /SC ONCE /ST 23:59 /F" -WindowStyle Hidden -Wait
$tasks += $t3

Write-Output "Created $($tasks.Count) credential access tasks"
foreach ($t in $tasks) {
    Start-Process "schtasks.exe" -ArgumentList "/Delete /TN `"$t`" /F" -WindowStyle Hidden -Wait
}
Write-Output "All tasks cleaned up"
