param(
  [string]$ApiBaseUrl = $env:ERP_API_URL,
  [string]$CronSecret = $env:ERP_CRON_SECRET
)

if (-not $ApiBaseUrl) {
  $ApiBaseUrl = "http://localhost:3001"
}
if (-not $CronSecret) {
  Write-Error "Indiquez -CronSecret ou la variable ERP_CRON_SECRET."
  exit 1
}

$uri = "$($ApiBaseUrl.TrimEnd('/'))/cron/leave-renew-exercise"

try {
  $response = Invoke-RestMethod -Method Post -Uri $uri -Headers @{
    "X-Cron-Secret" = $CronSecret
  }
  Write-Host "Renouvellement congés OK : $($response | ConvertTo-Json -Compress)"
  exit 0
}
catch {
  Write-Error "Échec : $($_.Exception.Message)"
  exit 1
}
