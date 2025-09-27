# Universal Deployment Script
# Automatically build Docker image and deploy to server
# Configurable for multiple projects

param(
    [string]$AppName = "training",
    [string]$AppPort = "2445",
    [string]$DockerFile = "Dockerfile_arm64",
    [string]$ServerIP = "192.168.1.169",
    [string]$Username = "", 
    [string]$Password = "",
    [string]$TargetFolder = "/node-server/",
    [string]$ImageName = "training-server",
    [string]$ImageTag = "arm64"
)

# Colors for output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Blue = "Cyan"

function Write-Status {
    param([string]$Message, [string]$Color = "White")
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $Color
}

function Exit-OnError {
    param([string]$Message)
    Write-Status $Message $Red
    exit 1
}

# Function to read .env file and return hashtable
function Read-EnvFile {
    param([string]$EnvFilePath)
    
    $envVars = @{}
    
    if (-not (Test-Path $EnvFilePath)) {
        Write-Status ".env file not found at: $EnvFilePath" $Yellow
        return $envVars
    }
    
    try {
        Get-Content $EnvFilePath | ForEach-Object {
            $line = $_.Trim()
            # Skip empty lines and comments
            if ($line -and -not $line.StartsWith('#')) {
                if ($line -match '^([^=]+)=(.*)$') {
                    $key = $matches[1].Trim()
                    $value = $matches[2].Trim()
                    # Remove quotes if present
                    if ($value.StartsWith('"') -and $value.EndsWith('"')) {
                        $value = $value.Substring(1, $value.Length - 2)
                    }
                    $envVars[$key] = $value
                }
            }
        }
        Write-Status "Loaded .env file successfully" $Green
    } catch {
        Write-Status "Error reading .env file: $_" $Yellow
    }
    
    return $envVars
}

# Function to decrypt password using SECRET_CODE
function Decrypt-Password {
    param(
        [string]$EncryptedPassword,
        [string]$SecretCode
    )
    
    if ([string]::IsNullOrEmpty($EncryptedPassword) -or [string]::IsNullOrEmpty($SecretCode)) {
        return ""
    }
    
    try {
        # Simple XOR encryption/decryption
        $encryptedBytes = [System.Convert]::FromBase64String($EncryptedPassword)
        $secretBytes = [System.Text.Encoding]::UTF8.GetBytes($SecretCode)
        $decryptedBytes = New-Object byte[] $encryptedBytes.Length
        
        for ($i = 0; $i -lt $encryptedBytes.Length; $i++) {
            $decryptedBytes[$i] = $encryptedBytes[$i] -bxor $secretBytes[$i % $secretBytes.Length]
        }
        
        return [System.Text.Encoding]::UTF8.GetString($decryptedBytes)
    } catch {
        Write-Status "Error decrypting password: $_" $Yellow
        return ""
    }
}

# Ensure script runs from its own directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir
Write-Status "Working directory: $(Get-Location)" $Blue

# Read .env file for SSH configuration
$envFilePath = Join-Path $ScriptDir ".env"
$envVars = Read-EnvFile -EnvFilePath $envFilePath

# Use .env values if available, otherwise use parameters or prompt
if ([string]::IsNullOrEmpty($ServerIP) -and $envVars.ContainsKey('SSH_HOST')) {
    $ServerIP = $envVars['SSH_HOST']
    Write-Status "Using SSH_HOST from .env: $ServerIP" $Blue
}

if ([string]::IsNullOrEmpty($Username) -and $envVars.ContainsKey('SSH_USER')) {
    $Username = $envVars['SSH_USER']
    Write-Status "Using SSH_USER from .env: $Username" $Blue
}

# Use PORT from .env if available
if ($envVars.ContainsKey('PORT')) {
    $AppPort = $envVars['PORT']
    Write-Status "Using PORT from .env: $AppPort" $Blue
}

# Handle encrypted password from .env
if ([string]::IsNullOrEmpty($Password)) {
    if ($envVars.ContainsKey('SSH_PASS_SEC') -and $envVars.ContainsKey('SECRET_CODE')) {
        $decryptedPassword = Decrypt-Password -EncryptedPassword $envVars['SSH_PASS_SEC'] -SecretCode $envVars['SECRET_CODE']
        if (-not [string]::IsNullOrEmpty($decryptedPassword)) {
            $Password = $decryptedPassword
            Write-Status "Using encrypted SSH password from .env" $Green
        }
    } elseif ($envVars.ContainsKey('SSH_PASS')) {
        $Password = $envVars['SSH_PASS']
        Write-Status "Using SSH_PASS from .env (WARNING: plaintext password)" $Yellow
    }
}

# Request login information if still not provided
if ([string]::IsNullOrEmpty($Username)) {
    $Username = Read-Host "Enter SSH username"
    if ([string]::IsNullOrEmpty($Username)) {
        Exit-OnError "Username cannot be empty"
    }
}

if ([string]::IsNullOrEmpty($Password)) {
    $SecurePassword = Read-Host "Enter SSH password for user '$Username'" -AsSecureString
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword))
    if ([string]::IsNullOrEmpty($Password)) {
        Exit-OnError "Password cannot be empty"
    }
}

Write-Status "Connecting to: ${Username}@${ServerIP}" $Blue

# Check if Docker is running
Write-Status "Checking Docker..." $Blue
try {
    $dockerVersion = docker version --format json 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker command failed: $dockerVersion"
    }
    Write-Status "Docker is running" $Green
} catch {
    Write-Status "Docker is not running. Attempting to start Docker Desktop..." $Yellow
    
    # Try to start Docker Desktop
    $dockerDesktopPath = @(
        "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe",
        "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
        "${env:LOCALAPPDATA}\Programs\Docker\Docker\Docker Desktop.exe"
    )
    
    $dockerFound = $false
    foreach ($path in $dockerDesktopPath) {
        if (Test-Path $path) {
            Write-Status "Starting Docker Desktop from: $path" $Blue
            Start-Process -FilePath $path -WindowStyle Minimized
            $dockerFound = $true
            break
        }
    }
    
    if (-not $dockerFound) {
        Exit-OnError "Docker Desktop not found. Please install Docker Desktop or start it manually."
    }
    
    # Wait for Docker to start
    Write-Status "Waiting for Docker to start (this may take 30-60 seconds)..." $Yellow
    $timeout = 120 # 2 minutes timeout
    $elapsed = 0
    $interval = 5
    
    while ($elapsed -lt $timeout) {
        Start-Sleep -Seconds $interval
        $elapsed += $interval
        
        try {
            docker version --format json 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Status "Docker started successfully!" $Green
                break
            }
        } catch {
            # Continue waiting
        }
        
        Write-Status "Still waiting for Docker... ($elapsed/$timeout seconds)" $Yellow
    }
    
    # Final check
    try {
        docker version --format json 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Docker still not responding"
        }
    } catch {
        Exit-OnError "Docker failed to start within $timeout seconds. Please start Docker Desktop manually and try again."
    }
}

# Check if SSH and SCP commands are available
Write-Status "Checking SSH and SCP..." $Blue
try {
    ssh -V 2>$null | Out-Null
    scp 2>$null | Out-Null
    Write-Status "SSH and SCP are available" $Green
} catch {
    Exit-OnError "SSH or SCP not available. Please install OpenSSH"
}

# Build Docker image
Write-Status "Starting Docker image build for ARM64..." $Yellow
Write-Status "Image: ${ImageName}:${ImageTag}" $Blue

try {
    # Enable Docker buildx for multi-platform builds
    Write-Status "Setting up Docker buildx for ARM64..." $Blue
    docker buildx create --use --name arm64-builder 2>$null | Out-Null
    
    # Build for ARM64 platform
    $buildResult = docker buildx build --platform linux/arm64 -f $DockerFile -t "${ImageName}:${ImageTag}" --load . 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed: $buildResult"
    }
    Write-Status "Docker image built successfully for ARM64" $Green
} catch {
    Exit-OnError "Error building Docker image: $_"
}

# Save Docker image to tar file
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dockerImageDir = Join-Path (Split-Path -Parent $ScriptDir) "docker-images"
if (-not (Test-Path $dockerImageDir)) {
    New-Item -ItemType Directory -Path $dockerImageDir -Force | Out-Null
    Write-Status "Created directory: $dockerImageDir" $Blue
}
$tarFileName = "${ImageName}_${ImageTag}_${timestamp}.tar"
$tarFilePath = Join-Path $dockerImageDir $tarFileName
Write-Status "Saving image to file $tarFilePath..." $Blue

try {
    docker save "${ImageName}:${ImageTag}" -o $tarFilePath
    if ($LASTEXITCODE -ne 0) {
        throw "Save failed"
    }
    Write-Status "Image saved successfully" $Green
} catch {
    Exit-OnError "Error saving Docker image: $_"
}

# Upload file to server via SCP
Write-Status "Uploading file to server $ServerIP..." $Blue

try {
    # Use PLINK (PuTTY) if available, otherwise use ssh with sshpass
    if (Get-Command plink -ErrorAction SilentlyContinue) {
        Write-Output "y" | plink -ssh -pw $Password ${Username}@${ServerIP} "mkdir -p $TargetFolder"
        Write-Output "y" | pscp -pw $Password $tarFilePath ${Username}@${ServerIP}:${TargetFolder}
    } else {
        # Use ssh with password environment variable
        $env:SSHPASS = $Password
        if (Get-Command sshpass -ErrorAction SilentlyContinue) {
            sshpass -e ssh -o StrictHostKeyChecking=no ${Username}@${ServerIP} "mkdir -p $TargetFolder"
            sshpass -e scp -o StrictHostKeyChecking=no $tarFilePath ${Username}@${ServerIP}:${TargetFolder}
        } else {
            # Fallback: manual ssh
            Write-Status "Need to enter password to upload file..." $Yellow
            ssh ${Username}@${ServerIP} "mkdir -p $TargetFolder"
            scp $tarFilePath ${Username}@${ServerIP}:${TargetFolder}
        }
    }
    
    if ($LASTEXITCODE -ne 0) {
        throw "Upload failed"
    }
    Write-Status "File uploaded successfully" $Green
} catch {
    Exit-OnError "Error uploading file: $_"
}

# SSH to server and deploy
Write-Status "Deploying on server..." $Blue

$deployCommands = @(
    "cd $TargetFolder",
    "echo 'Loading Docker image...'",
    "docker load -i $tarFileName",
    "echo 'Stopping existing container...'",
    "docker stop $AppName 2>/dev/null || true",
    "docker rm $AppName 2>/dev/null || true",
    "echo 'Creating db directory...'",
    "mkdir -p ./db/$AppName",
    "echo 'Starting new container...'",
    "docker run -d --name $AppName -p ${AppPort}:${AppPort} -e NODE_ENV=production -e PORT=${AppPort} --user root -v ./db/${AppName}:/app/db -v ./.env_${AppName}:/app/.env:ro --restart unless-stopped ${ImageName}:${ImageTag}",
    "echo 'Cleaning up tar file...'",
    "rm -f $tarFileName",
    "echo 'Deployment completed successfully!'",
    "docker ps | grep $AppName"
)

$deployScript = $deployCommands -join " && "

try {
    if (Get-Command plink -ErrorAction SilentlyContinue) {
        Write-Output "y" | plink -ssh -pw $Password ${Username}@${ServerIP} $deployScript
    } else {
        if (Get-Command sshpass -ErrorAction SilentlyContinue) {
            sshpass -e ssh -o StrictHostKeyChecking=no ${Username}@${ServerIP} $deployScript
        } else {
            Write-Status "Need to enter password to deploy..." $Yellow
            ssh ${Username}@${ServerIP} $deployScript
        }
    }
    
    if ($LASTEXITCODE -ne 0) {
        throw "Deploy failed"
    }
    Write-Status "Deployment successful!" $Green
} catch {
    Exit-OnError "Error during deployment: $_"
}

# Cleanup local tar file
# Write-Status "Cleaning up temporary files..." $Blue
# try {
#     Remove-Item $tarFilePath -Force
#     Write-Status "Cleanup completed" $Green
# } catch {
#     Write-Status "Cannot delete file $tarFilePath" $Yellow
# }

# Check service after deployment
Write-Status "Checking service status..." $Blue
try {
    $checkCommand = "curl -f http://localhost:$AppPort/health 2>/dev/null || echo 'Health check endpoint not available'"
    
    if (Get-Command plink -ErrorAction SilentlyContinue) {
        $healthCheck = Write-Output "y" | plink -ssh -pw $Password ${Username}@${ServerIP} $checkCommand
    } else {
        if (Get-Command sshpass -ErrorAction SilentlyContinue) {
            $healthCheck = sshpass -e ssh -o StrictHostKeyChecking=no ${Username}@${ServerIP} $checkCommand
        } else {
            Write-Status "Manual check required: http://${ServerIP}:${AppPort}" $Yellow
            $healthCheck = "Manual check required"
        }
    }
    
    Write-Status "Health check result: $healthCheck" $Blue
} catch {
    Write-Status "Cannot perform automatic health check" $Yellow
}

# Cleanup Docker buildx builder
Write-Status "Cleaning up Docker buildx builder..." $Blue
try {
    docker buildx rm arm64-builder 2>$null | Out-Null
} catch {
    # Ignore cleanup errors
}

Write-Status "DEPLOYMENT COMPLETED!" $Green
Write-Status "Server: http://${ServerIP}:${AppPort}" $Green
Write-Status "App: $AppName" $Green
Write-Status "Container: $AppName" $Green
Write-Status "Image: ${ImageName}:${ImageTag}" $Green

Write-Status "DEPLOYMENT INFO" $Blue
Write-Status "- Server IP: $ServerIP" $Blue
Write-Status "- Port: $AppPort" $Blue  
Write-Status "- App Name: $AppName" $Blue
Write-Status "- Container Name: $AppName" $Blue
Write-Status "- Image: ${ImageName}:${ImageTag}" $Blue
Write-Status "- Deploy Time: $(Get-Date)" $Blue
