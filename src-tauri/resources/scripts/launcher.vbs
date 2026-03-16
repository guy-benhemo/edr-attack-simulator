Dim fso, shell, scriptDir, tempBase, resultsDir, manifestPath
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
tempBase = shell.ExpandEnvironmentStrings("%TEMP%") & "\guardz_emu"
resultsDir = tempBase & "\results"
manifestPath = tempBase & "\manifest.json"

If Not fso.FolderExists(resultsDir) Then
    fso.CreateFolder(resultsDir)
End If

shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & scriptDir & "\runner.ps1"" -ScriptsDir """ & scriptDir & """ -ResultsDir """ & resultsDir & """ -ManifestPath """ & manifestPath & """", 0, False
