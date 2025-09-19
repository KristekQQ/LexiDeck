Param(
  [string]$HostIP = ""
)

Write-Host "== LexiDeck HTTPS setup (Windows) =="

function Ensure-Choco {
  if (Get-Command choco -ErrorAction SilentlyContinue) { return }
  Write-Host "Installing Chocolatey..."
  Set-ExecutionPolicy Bypass -Scope Process -Force
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
  Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}

function Ensure-Mkcert {
  if (Get-Command mkcert -ErrorAction SilentlyContinue) { return }
  Write-Host "Installing mkcert..."
  choco install mkcert -y
}

Ensure-Choco
Ensure-Mkcert

Write-Host "Installing local CA (once) ..."
mkcert -install

if (-not $HostIP) {
  $ip = (Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp -ErrorAction SilentlyContinue | Where-Object {$_.IPAddress -notlike '127.*'} | Select-Object -First 1 -ExpandProperty IPAddress)
  if (-not $ip) { $ip = "localhost" }
  $HostIP = $ip
}

Write-Host "Generating cert for $HostIP ..."
mkcert $HostIP

$key = "$PWD/$("$HostIP" + "-key.pem")"
$crt = "$PWD/$("$HostIP" + ".pem")"
New-Item -ItemType Directory -Force -Path cert | Out-Null
Copy-Item $key cert/server.key -Force
Copy-Item $crt cert/server.crt -Force

# Copy CA for mobile install convenience
$caroot = mkcert -CAROOT
if (Test-Path "$caroot\rootCA.pem") {
  Copy-Item "$caroot\rootCA.pem" cert/rootCA.crt -Force
}

Write-Host "\nDone. Start HTTPS dev server with:" -ForegroundColor Green
Write-Host "  npm run dev" -ForegroundColor Green
Write-Host "Then open: https://$HostIP:5173" -ForegroundColor Green

