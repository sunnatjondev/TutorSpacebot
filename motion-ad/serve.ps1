$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://*:$port/")

try {
    $listener.Start()
} catch {
    $port = 8085
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://*:$port/")
    $listener.Start()
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*" }).IPAddress | Select-Object -First 1

Write-Host "===========================================================" -ForegroundColor Green
Write-Host "TUTORSPACE MOTION CANVAS IS LIVE FOR YOUR PHONE!" -ForegroundColor Yellow
Write-Host "===========================================================" -ForegroundColor Green
Write-Host "1. Connect your Phone and Laptop to the SAME Wi-Fi network."
Write-Host "2. Open Safari or Chrome on your PHONE and type this address:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   👉 http://$($ip):$port" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. The ad plays natively on your phone screen at smooth 60 FPS!"
Write-Host "===========================================================" -ForegroundColor Green

$rootDir = $PSScriptRoot

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/") { $localPath = "/index.html" }
        
        $relPath = $localPath.Substring(1)
        $filePath = [System.IO.Path]::Combine($rootDir, $relPath)
        
        if ([System.IO.File]::Exists($filePath)) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            
            if ($ext -eq ".html") { $response.ContentType = "text/html; charset=utf-8" }
            elseif ($ext -eq ".css") { $response.ContentType = "text/css; charset=utf-8" }
            elseif ($ext -eq ".js") { $response.ContentType = "text/javascript; charset=utf-8" }
            elseif ($ext -eq ".png") { $response.ContentType = "image/png" }
            elseif ($ext -eq ".jpg") { $response.ContentType = "image/jpeg" }
            elseif ($ext -eq ".svg") { $response.ContentType = "image/svg+xml" }
            else { $response.ContentType = "application/octet-stream" }
            
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.OutputStream.Close()
    } catch {
        # ignore disconnects
    }
}
