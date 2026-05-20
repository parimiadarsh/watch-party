# Log Docker into GCR / Artifact Registry for push/pull.
# Fixes common Windows issue: credHelpers "gcloud" runs docker-credential-gcloud which is
# not on Docker's PATH → every pull is Unauthenticated. We clear that and use a token.
#
# Usage:
#   $env:GCP_PROJECT_ID = "project-332623"
#   .\scripts\auth-docker-gcr.ps1
#
# Your Google account needs: roles/artifactregistry.reader (pull) on the project.

param(
    [string]$ProjectId = $env:GCP_PROJECT_ID
)

$ErrorActionPreference = "Stop"

$GcloudBin = "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin"
$Gcloud = "gcloud"
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    if (Test-Path "$GcloudBin\gcloud.cmd") {
        $Gcloud = "$GcloudBin\gcloud.cmd"
        $env:Path = "$GcloudBin;$env:Path"
    } else {
        Write-Error "gcloud not found. Install Google Cloud SDK."
    }
}

if (-not $ProjectId) {
    Write-Error "Set GCP_PROJECT_ID or pass -ProjectId (e.g. project-332623)"
}

& $Gcloud config set project $ProjectId | Out-Host

Write-Host "Enabling APIs (if allowed)..."
& $Gcloud services enable artifactregistry.googleapis.com containerregistry.googleapis.com --project=$ProjectId 2>$null | Out-Host

$DockerConfig = Join-Path $env:USERPROFILE '.docker\config.json'
if (Test-Path $DockerConfig) {
    Write-Host "Removing gcr.io from Docker credHelpers (broken gcloud helper causes Unauthenticated pulls)..."
    try {
        $raw = Get-Content $DockerConfig -Raw -Encoding UTF8
        $j = $raw | ConvertFrom-Json
        $changed = $false
        if ($null -ne $j.credHelpers) {
            $keep = [ordered]@{}
            foreach ($p in $j.credHelpers.PSObject.Properties) {
                $name = $p.Name
                if ($name -eq 'gcr.io' -or $name -eq 'us.gcr.io' -or $name -eq 'eu.gcr.io' -or $name -eq 'asia.gcr.io' -or $name -eq 'marketplace.gcr.io') {
                    $changed = $true
                    continue
                }
                $keep[$name] = $p.Value
            }
            if ($changed) {
                if ($keep.Count -eq 0) {
                    $j.PSObject.Properties.Remove('credHelpers')
                } else {
                    $j.credHelpers = [pscustomobject]$keep
                }
                $j | ConvertTo-Json -Depth 20 | Set-Content $DockerConfig -Encoding UTF8
                Write-Host "Updated $DockerConfig"
            }
        }
    } catch {
        Write-Warning "Could not patch Docker config: $_ — if pulls stay Unauthenticated, edit $DockerConfig and delete gcr.io under credHelpers."
    }
}

Write-Host "Docker logout gcr.io (clear stale auth)..."
& docker logout gcr.io 2>$null
& docker logout https://us-docker.pkg.dev 2>$null

Write-Host "Getting access token — run  gcloud auth login  if this fails..."
$token = & $Gcloud auth print-access-token --project=$ProjectId
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($token)) {
    Write-Error "No token — run: gcloud auth login  (account needs Artifact Registry Reader on project $ProjectId)"
}

foreach ($reg in @('https://gcr.io', 'https://us-docker.pkg.dev')) {
    Write-Host "docker login $reg ..."
    $token | docker login -u oauth2accesstoken --password-stdin $reg
    if ($LASTEXITCODE -ne 0) { Write-Error "docker login failed for $reg" }
}

Write-Host ""
Write-Host "OK — try a single pull:"
Write-Host "  docker pull gcr.io/${ProjectId}/watchparty-mid:latest"
Write-Host ""
Write-Host "Then:"
Write-Host "  docker compose -f docker-compose.gcr.yml pull"
Write-Host "  docker compose -f docker-compose.gcr.yml up -d"
Write-Host ""
Write-Host "Token expires in about an hour — re-run this script before pulls."
Write-Host "Use the SAME shell (and same user) for auth and compose — not WSL mixed with Windows."
