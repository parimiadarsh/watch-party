# Build and push watch-party images to Google Container Registry (gcr.io).
# Usage (repo root):
#   $env:GCP_PROJECT_ID = "my-gcp-project"
#   $env:VITE_GOOGLE_CLIENT_ID = "....apps.googleusercontent.com"   # optional, baked into frontend
#   .\scripts\push-images-gcr.ps1
#   .\scripts\push-images-gcr.ps1 -Tag "1.0.0"

param(
    [string]$ProjectId = $env:GCP_PROJECT_ID,
    [string]$Tag = $(if ($env:IMAGE_TAG) { $env:IMAGE_TAG } else { "latest" }),
    [string]$GoogleClientId = $(if ($env:VITE_GOOGLE_CLIENT_ID) { $env:VITE_GOOGLE_CLIENT_ID } else { $env:GOOGLE_CLIENT_ID })
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not $ProjectId) {
    Write-Error "Set GCP_PROJECT_ID or pass -ProjectId"
}

$Gcloud = "gcloud"
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    $GcloudCmd = "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
    if (Test-Path $GcloudCmd) { $Gcloud = $GcloudCmd } else { Write-Error "gcloud not found on PATH" }
}

$Registry = "gcr.io/$ProjectId"
$BackendImage = "$Registry/watch-party-backend:$Tag"
$MiddlewareImage = "$Registry/watch-party-middleware:$Tag"
$FrontendImage = "$Registry/watch-party-frontend:$Tag"

Write-Host "Configuring Docker for GCR..."
& $PSScriptRoot\auth-docker-gcr.ps1 -ProjectId $ProjectId

Write-Host "Building backend -> $BackendImage"
docker build -t $BackendImage ./backend

Write-Host "Building middleware -> $MiddlewareImage"
docker build -t $MiddlewareImage ./middleware

Write-Host "Building frontend -> $FrontendImage"
docker build `
    --build-arg "VITE_GOOGLE_CLIENT_ID=$GoogleClientId" `
    -t $FrontendImage `
    ./frontend

Write-Host "Pushing..."
docker push $BackendImage
docker push $MiddlewareImage
docker push $FrontendImage

if ($Tag -ne "latest") {
    docker tag $BackendImage "$Registry/watch-party-backend:latest"
    docker tag $MiddlewareImage "$Registry/watch-party-middleware:latest"
    docker tag $FrontendImage "$Registry/watch-party-frontend:latest"
    docker push "$Registry/watch-party-backend:latest"
    docker push "$Registry/watch-party-middleware:latest"
    docker push "$Registry/watch-party-frontend:latest"
}

Write-Host ""
Write-Host "Done."
Write-Host "  $BackendImage"
Write-Host "  $MiddlewareImage"
Write-Host "  $FrontendImage"
Write-Host ""
Write-Host "On the VM: set GCP_PROJECT_ID and IMAGE_TAG in .env, then:"
Write-Host "  docker compose -f docker-compose.gcr.yml pull"
Write-Host "  docker compose -f docker-compose.gcr.yml up -d"
