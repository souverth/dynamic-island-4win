# Get OS Name
$os = Get-CimInstance Win32_OperatingSystem
$os_name = $os.Caption

# Get CPU Name
$cpu = Get-CimInstance Win32_Processor
$cpu_name = $cpu.Name.Trim()

# Get RAM info (Total & Free in MB)
$ram_total = [Math]::Round($os.TotalVisibleMemorySize / 1024)
$ram_free = [Math]::Round($os.FreePhysicalMemory / 1024)

# Get Disk C: info (Total & Free in GB)
$disk_c = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$disk_total = [Math]::Round($disk_c.Size / 1GB)
$disk_free = [Math]::Round($disk_c.FreeSpace / 1GB)

# Get physical disk info (Model & Health)
$physical_disk = Get-CimInstance -Namespace root\Microsoft\Windows\Storage -ClassName MSFT_PhysicalDisk | Where-Object { $_.DeviceNumber -eq 0 }
if ($physical_disk) {
    $disk_model = $physical_disk.FriendlyName.Trim()
    $health_status = $physical_disk.HealthStatus
    $disk_health = if ($health_status -eq 0) { "Healthy" } elseif ($health_status -eq 1) { "Warning" } else { "Unhealthy" }
    $disk_health_pct = if ($physical_disk.PercentWear) { 100 - $physical_disk.PercentWear } else { 100 }
} else {
    $disk_model = "System Disk"
    $disk_health = "Healthy"
    $disk_health_pct = 100
}

# Get Battery details
$battery_design = 0
$battery_full = 0
$battery_current = 0
$battery_cycles = 0

$battery = Get-CimInstance -Namespace root\WMI -ClassName BatteryStatus -ErrorAction SilentlyContinue
$battery_static = Get-CimInstance -Namespace root\WMI -ClassName BatteryStaticData -ErrorAction SilentlyContinue
$battery_full_cap = Get-CimInstance -Namespace root\WMI -ClassName BatteryFullChargedCapacity -ErrorAction SilentlyContinue
$battery_cycle_count = Get-CimInstance -Namespace root\WMI -ClassName BatteryCycleCount -ErrorAction SilentlyContinue

if ($battery_static) {
    $battery_design = $battery_static.DesignedCapacity
    $battery_full = if ($battery_full_cap) { $battery_full_cap.FullChargedCapacity } else { $battery_static.DesignedCapacity }
    $battery_current = if ($battery) { $battery.RemainingCapacity } else { $battery_full }
    $battery_cycles = if ($battery_cycle_count) { $battery_cycle_count.CycleCount } else { 0 }
} else {
    # Fallback: Query Win32_Battery
    $win32_batt = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue
    if ($win32_batt) {
        $pct = $win32_batt.EstimatedChargeRemaining
        $tempReport = "$env:TEMP\batteryreport.html"
        powercfg /batteryreport /output $tempReport | Out-Null
        if (Test-Path $tempReport) {
            $html = Get-Content -Path $tempReport -Raw
            if ($html -match 'DESIGN CAPACITY.*?([\d,]+)\s*mWh') {
                $battery_design = [int]($Matches[1] -replace ',','')
            }
            if ($html -match 'FULL CHARGE CAPACITY.*?([\d,]+)\s*mWh') {
                $battery_full = [int]($Matches[1] -replace ',','')
            }
            if ($html -match 'CYCLE COUNT.*?([\d,]+)') {
                $battery_cycles = [int]($Matches[1] -replace ',','')
            }
            Remove-Item $tempReport -Force -ErrorAction SilentlyContinue
        }
        
        if ($battery_design -eq 0) {
            $battery_design = 50000
            $battery_full = 50000
        }
        $battery_current = [int]($battery_full * ($pct / 100))
    }
}


$output = @{
    os_name = $os_name
    cpu_name = $cpu_name
    ram_total = [int]$ram_total
    ram_free = [int]$ram_free
    disk_total = [int]$disk_total
    disk_free = [int]$disk_free
    disk_model = $disk_model
    disk_health = $disk_health
    disk_health_pct = [int]$disk_health_pct
    battery_design = [int]$battery_design
    battery_full = [int]$battery_full
    battery_current = [int]$battery_current
    battery_cycles = [int]$battery_cycles
}

ConvertTo-Json $output
