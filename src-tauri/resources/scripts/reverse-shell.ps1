$ErrorActionPreference = 'SilentlyContinue'
try {
    $socket = New-Object Net.Sockets.TCPClient('127.0.0.1', 4444)
    $netStream = $socket.GetStream()
    $writer = New-Object System.IO.StreamWriter($netStream)
    $writer.AutoFlush = $true
    $writer.WriteLine("whoami")
    $reader = New-Object System.IO.StreamReader($netStream)
    $response = $reader.ReadLine()
    Write-Output "C2 callback pattern executed, response: $response"
    $socket.Close()
} catch {
    Write-Output "TCP connection to 127.0.0.1:4444 failed (expected - no listener)"
}
