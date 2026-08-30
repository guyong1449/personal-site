[CmdletBinding()]
param(
  [ValidateSet("start", "stop", "restart", "status")]
  [string]$Action = "start",
  [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
} else {
  $RepoRoot = [IO.Path]::GetFullPath($RepoRoot)
}

$RuntimeRoot = Join-Path $RepoRoot ".local-content\runtime"
$WebPidFile = Join-Path $RuntimeRoot "web.pid"
$StudioPidFile = Join-Path $RuntimeRoot "studio.pid"
$WebLog = Join-Path $RuntimeRoot "web.log"
$WebErrorLog = Join-Path $RuntimeRoot "web-error.log"
$StudioLog = Join-Path $RuntimeRoot "studio.log"
$StudioErrorLog = Join-Path $RuntimeRoot "studio-error.log"
$Corepack = (Get-Command "corepack.cmd" -ErrorAction Stop).Source

New-Item -ItemType Directory -Force -Path $RuntimeRoot | Out-Null

function Get-PortPids([int]$Port) {
  @(
    Get-NetTCPConnection -State Listen -LocalAddress "127.0.0.1" -LocalPort $Port -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique
  )
}

function Get-ProcessRecord([int]$ProcessId) {
  return Get-CimInstance Win32_Process -Filter ("ProcessId=" + $ProcessId) -ErrorAction SilentlyContinue
}

function Test-RepoCommandLine([string]$CommandLine) {
  if ([string]::IsNullOrWhiteSpace($CommandLine)) { return $false }
  $rootPattern = [regex]::Escape($RepoRoot.TrimEnd("\"))
  return $CommandLine -match $rootPattern
}

function Test-OwnedProcess([int]$ProcessId) {
  $initialRecord = Get-ProcessRecord $ProcessId
  if ($null -eq $initialRecord) { return $false }
  if (Test-RepoCommandLine ([string]$initialRecord.CommandLine)) { return $true }

  $validatedLaunchers = [System.Collections.Generic.HashSet[int]]::new()
  foreach ($launcherPidFile in @($WebPidFile, $StudioPidFile)) {
    $launcherProcessId = Get-PidFromFile $launcherPidFile
    if ($launcherProcessId -le 0) { continue }
    $launcherRecord = Get-ProcessRecord $launcherProcessId
    if ($null -ne $launcherRecord -and (Test-RepoCommandLine ([string]$launcherRecord.CommandLine))) {
      $validatedLaunchers.Add($launcherProcessId) | Out-Null
    }
  }

  $visited = [System.Collections.Generic.HashSet[int]]::new()
  $currentProcessId = $ProcessId
  for ($depth = 0; $depth -lt 8 -and $currentProcessId -gt 0; $depth += 1) {
    if (-not $visited.Add($currentProcessId)) { break }
    if ($validatedLaunchers.Contains($currentProcessId)) { return $true }
    $processRecord = Get-ProcessRecord $currentProcessId
    if ($null -eq $processRecord) { break }
    $parentProcessId = [int]$processRecord.ParentProcessId
    if ($parentProcessId -eq $currentProcessId) { break }
    $currentProcessId = $parentProcessId
  }
  return $false
}

function Test-Healthy([string]$Url) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 300
  } catch {
    return $false
  }
}

function Get-PidFromFile([string]$PidFile) {
  if (-not (Test-Path -LiteralPath $PidFile)) { return 0 }
  $rawValue = Get-Content -LiteralPath $PidFile -Raw
  if ([string]::IsNullOrWhiteSpace([string]$rawValue)) { return 0 }
  $value = ([string]$rawValue).Trim()
  $parsedPid = 0
  if ([int]::TryParse($value, [ref]$parsedPid) -and $parsedPid -gt 0) { return $parsedPid }
  return 0
}

function Get-Status([int]$Port, [string]$HealthUrl) {
  $pids = @(Get-PortPids $Port)
  $ownedPids = @($pids | Where-Object { Test-OwnedProcess ([int]$_) })
  [pscustomobject]@{
    Port = $Port
    Listening = [bool]($pids.Count -gt 0)
    Owned = [bool]($ownedPids.Count -gt 0)
    Healthy = Test-Healthy $HealthUrl
    Pids = ($pids -join ",")
  }
}

function Assert-PortAvailable([int]$Port) {
  $pids = @(Get-PortPids $Port)
  $foreign = @($pids | Where-Object { -not (Test-OwnedProcess ([int]$_)) })
  if ($foreign.Count -gt 0) {
    throw "端口 $Port 已被非 GUYONG 进程占用（PID: $($foreign -join ',')），不会结束该进程。"
  }
}

function ConvertTo-ProcessArgument([string]$Value) {
  return '"' + $Value.Replace('"', '\"') + '"'
}

function Start-ServiceProcess(
  [int]$Port,
  [string]$PidFile,
  [string]$OutputLog,
  [string]$ErrorLog,
  [string]$WorkingDirectory,
  [string[]]$CommandArguments
) {
  Assert-PortAvailable $Port
  $existing = @(Get-PortPids $Port | Where-Object { Test-OwnedProcess ([int]$_) })
  if ($existing.Count -gt 0) { return }

  $argumentLine = (($CommandArguments | ForEach-Object { ConvertTo-ProcessArgument ([string]$_) }) -join " ")
  $process = Start-Process -FilePath $Corepack -ArgumentList $argumentLine -WorkingDirectory $WorkingDirectory `
    -RedirectStandardOutput $OutputLog -RedirectStandardError $ErrorLog -WindowStyle Hidden -PassThru
  Set-Content -LiteralPath $PidFile -Value $process.Id -Encoding ascii
}

function Stop-ServiceProcess([int]$Port, [string]$PidFile) {
  $ids = [System.Collections.Generic.List[int]]::new()
  $pidFromFile = Get-PidFromFile $PidFile
  if ($pidFromFile -gt 0) {
    if (Test-OwnedProcess $pidFromFile) {
      $ids.Add($pidFromFile)
    } else {
      Write-Warning ("PID 文件不是当前仓库进程，跳过：" + $pidFromFile)
    }
  }
  foreach ($processId in @(Get-PortPids $Port)) {
    if (Test-OwnedProcess ([int]$processId)) {
      $ids.Add([int]$processId)
    }
  }
  foreach ($processId in ($ids | Select-Object -Unique)) {
    if ($null -ne (Get-ProcessRecord ([int]$processId))) {
      & taskkill.exe /PID $processId /T /F 2>$null | Out-Null
    }
  }
  Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
}

function Show-Status {
  @(Get-Status 4317 "http://127.0.0.1:4317/") + @(Get-Status 4319 "http://127.0.0.1:4319/healthz") |
    Format-Table -AutoSize | Out-String | Write-Output
}

function Wait-Ready {
  $deadline = (Get-Date).AddSeconds(45)
  do {
    $web = Get-Status 4317 "http://127.0.0.1:4317/"
    $studio = Get-Status 4319 "http://127.0.0.1:4319/healthz"
    if ($web.Owned -and $web.Healthy -and $studio.Owned -and $studio.Healthy) {
      return
    }
    Start-Sleep -Milliseconds 500
  } while ((Get-Date) -lt $deadline)
  throw "服务未在 45 秒内就绪。请检查 $WebLog、$WebErrorLog、$StudioLog、$StudioErrorLog。"
}

switch ($Action) {
  "stop" {
    Stop-ServiceProcess 4317 $WebPidFile
    Stop-ServiceProcess 4319 $StudioPidFile
    Write-Output "GUYONG services stopped."
  }
  "status" {
    Show-Status
  }
  "restart" {
    Stop-ServiceProcess 4317 $WebPidFile
    Stop-ServiceProcess 4319 $StudioPidFile
    Start-ServiceProcess 4317 $WebPidFile $WebLog $WebErrorLog $RepoRoot @("pnpm", "--dir", (Join-Path $RepoRoot "apps\web"), "dev")
    Start-ServiceProcess 4319 $StudioPidFile $StudioLog $StudioErrorLog $RepoRoot @("pnpm", "--dir", (Join-Path $RepoRoot "tools\studio"), "start")
    Wait-Ready
    Write-Output "GUYONG services ready."
  }
  "start" {
    Start-ServiceProcess 4317 $WebPidFile $WebLog $WebErrorLog $RepoRoot @("pnpm", "--dir", (Join-Path $RepoRoot "apps\web"), "dev")
    Start-ServiceProcess 4319 $StudioPidFile $StudioLog $StudioErrorLog $RepoRoot @("pnpm", "--dir", (Join-Path $RepoRoot "tools\studio"), "start")
    Wait-Ready
    Write-Output "GUYONG services ready."
  }
}
