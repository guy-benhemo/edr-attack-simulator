$prefix = "S1E_$([Guid]::NewGuid().ToString('N').Substring(0,8))"
$tasks = @()

$t1 = "${prefix}_RS"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$t1`" /TR `"cmd.exe /c reg query HKLM\SAM`" /SC ONCE /ST 23:59 /F" -WindowStyle Hidden -Wait
$tasks += $t1
Start-Sleep -Milliseconds 500

$t2 = "${prefix}_CC"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$t2`" /TR `"cmd.exe /c dir `"%LOCALAPPDATA%\Google\Chrome\User Data\Default\Login Data`"`" /SC ONCE /ST 23:59 /F" -WindowStyle Hidden -Wait
$tasks += $t2
Start-Sleep -Milliseconds 500

$t3 = "${prefix}_ND"
Start-Process "schtasks.exe" -ArgumentList "/Create /TN `"$t3`" /TR `"cmd.exe /c nltest /dclist:`" /SC ONCE /ST 23:59 /F" -WindowStyle Hidden -Wait
$tasks += $t3

Write-Output "Created $($tasks.Count) suspicious persistence tasks"
foreach ($t in $tasks) {
    Start-Process "schtasks.exe" -ArgumentList "/Delete /TN `"$t`" /F" -WindowStyle Hidden -Wait
}
Write-Output "All tasks cleaned up"
