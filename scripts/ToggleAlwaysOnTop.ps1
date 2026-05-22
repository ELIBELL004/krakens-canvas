param(
  [switch]$Quiet
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$launcher = Join-Path $projectRoot "Start Inkboard.cmd"

$nativeType = "KrakensCanvasWindowTools"
if (-not ($nativeType -as [type])) {
  Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class KrakensCanvasWindowTools
{
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetWindowPos(
        IntPtr hWnd,
        IntPtr hWndInsertAfter,
        int X,
        int Y,
        int cx,
        int cy,
        uint uFlags
    );

    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtr", SetLastError = true)]
    public static extern IntPtr GetWindowLongPtr64(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll", EntryPoint = "GetWindowLong", SetLastError = true)]
    public static extern IntPtr GetWindowLongPtr32(IntPtr hWnd, int nIndex);

    public static IntPtr GetWindowLongPtr(IntPtr hWnd, int nIndex)
    {
        return IntPtr.Size == 8
            ? GetWindowLongPtr64(hWnd, nIndex)
            : GetWindowLongPtr32(hWnd, nIndex);
    }
}
"@
}

function Get-KrakensCanvasWindow {
  Get-Process msedge -ErrorAction SilentlyContinue |
    Where-Object {
      $_.MainWindowHandle -ne 0 -and
      $_.MainWindowTitle -like "*Krakens Canvas*"
    } |
    Select-Object -First 1
}

$window = Get-KrakensCanvasWindow

if (-not $window) {
  Start-Process -FilePath $launcher -WorkingDirectory $projectRoot

  $deadline = (Get-Date).AddSeconds(6)
  do {
    Start-Sleep -Milliseconds 250
    $window = Get-KrakensCanvasWindow
  } while (-not $window -and (Get-Date) -lt $deadline)
}

if (-not $window) {
  throw "Could not find or open the Krakens Canvas window."
}

$gwlExStyle = -20
$wsExTopmost = 0x00000008
$hwndTopmost = [IntPtr](-1)
$hwndNotTopmost = [IntPtr](-2)
$swpNoMove = 0x0002
$swpNoSize = 0x0001
$swpNoActivate = 0x0010
$flags = $swpNoMove -bor $swpNoSize -bor $swpNoActivate

$style = [KrakensCanvasWindowTools]::GetWindowLongPtr($window.MainWindowHandle, $gwlExStyle).ToInt64()
$isTopmost = ($style -band $wsExTopmost) -ne 0
$target = if ($isTopmost) { $hwndNotTopmost } else { $hwndTopmost }
$verb = if ($isTopmost) { "unpinned" } else { "pinned" }

$ok = [KrakensCanvasWindowTools]::SetWindowPos(
  $window.MainWindowHandle,
  $target,
  0,
  0,
  0,
  0,
  $flags
)

if (-not $ok) {
  throw "Windows refused to change the Krakens Canvas window pin state."
}

if (-not $Quiet) {
  $shell = New-Object -ComObject WScript.Shell
  $null = $shell.Popup("Krakens Canvas is now $verb.", 2, "Krakens Canvas", 64)
}
