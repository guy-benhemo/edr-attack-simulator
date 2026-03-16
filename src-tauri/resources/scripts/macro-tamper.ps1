$versions = "14.0", "15.0", "16.0"
$paths = @()
foreach ($v in $versions) {
    $p = "HKCU:\Software\Microsoft\Office\$v\SecurityTestEmu"
    if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
    $paths += $p
    New-ItemProperty -Path $p -Name "AccessVBOM" -Value 1 -PropertyType DWORD -Force | Out-Null
    New-ItemProperty -Path $p -Name "VbaWarnings" -Value 1 -PropertyType DWORD -Force | Out-Null
    New-ItemProperty -Path $p -Name "MacroPolicyOverride" -Value 1 -PropertyType DWORD -Force | Out-Null
    New-ItemProperty -Path $p -Name "VBEBypassFlag" -Value 1 -PropertyType DWORD -Force | Out-Null
    Write-Output "Created macro security keys for Office $v"
}
foreach ($p in $paths) {
    Remove-Item -Path $p -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Output "All emulation registry keys cleaned up"
