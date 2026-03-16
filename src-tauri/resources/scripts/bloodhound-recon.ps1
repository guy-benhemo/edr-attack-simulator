$fakeOut = "$env:TEMP\bh_$([Guid]::NewGuid().ToString('N').Substring(0,8)).txt"
$harmless = "echo benign > `"$fakeOut`""
$bhCmd = "Invoke-BloodHound -CollectionMethod All -Domain CONTOSO.LOCAL; Get-BloodHoundData; $harmless"
$proc = Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-Command $bhCmd" `
    -WindowStyle Hidden -Wait -PassThru
Write-Output "BloodHound emulation completed (Exit code: $($proc.ExitCode))"
Remove-Item $fakeOut -Force -ErrorAction SilentlyContinue
