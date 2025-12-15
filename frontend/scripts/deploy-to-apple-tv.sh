#!/bin/bash

# Apple TV Deployment Script
# This script helps deploy your built iOS TV app to an Apple TV with developer mode enabled

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if Apple TV is connected
check_apple_tv_connection() {
    print_status "Checking for connected Apple TV devices..."
    
    if command_exists xcrun; then
        # Use xcrun to list devices
        DEVICES=$(xcrun devicectl list devices 2>/dev/null | grep "Apple TV" || true)
        if [ -n "$DEVICES" ]; then
            print_success "Found Apple TV device(s):"
            echo "$DEVICES"
            return 0
        fi
    fi
    
    # Fallback to system_profiler
    if command_exists system_profiler; then
        DEVICES=$(system_profiler SPUSBDataType | grep -A 5 "Apple TV" || true)
        if [ -n "$DEVICES" ]; then
            print_success "Found Apple TV device via USB:"
            echo "$DEVICES"
            return 0
        fi
    fi
    
    print_error "No Apple TV devices found. Please ensure:"
    echo "  1. Apple TV is connected via USB-C cable"
    echo "  2. Developer Mode is enabled on Apple TV"
    echo "  3. Apple TV is trusted on this Mac"
    return 1
}

# Function to extract and deploy IPA
deploy_ipa() {
    local IPA_FILE="$1"
    local DEVICE_UDID="$2"

    if [ ! -f "$IPA_FILE" ]; then
        print_error "IPA file not found: $IPA_FILE"
        return 1
    fi

    print_status "Extracting IPA file: $IPA_FILE"

    # Create temporary directory for extraction
    EXTRACT_DIR="./temp_extract_$(date +%s)"
    mkdir -p "$EXTRACT_DIR"

    # Extract IPA
    unzip -q "$IPA_FILE" -d "$EXTRACT_DIR"

    # Find the .app bundle
    APP_BUNDLE=$(find "$EXTRACT_DIR" -name "*.app" | head -n 1)

    if [ -z "$APP_BUNDLE" ]; then
        print_error "No .app bundle found in IPA file"
        rm -rf "$EXTRACT_DIR"
        return 1
    fi

    print_success "Found app bundle: $APP_BUNDLE"

    # Deploy using ios-deploy if available
    if command_exists ios-deploy; then
        if [ -n "$DEVICE_UDID" ]; then
            print_status "Deploying using ios-deploy to device with UDID: $DEVICE_UDID..."
            ios-deploy --bundle "$APP_BUNDLE" --id "$DEVICE_UDID"
        else
            print_status "Deploying using ios-deploy..."
            ios-deploy --bundle "$APP_BUNDLE" --device
        fi
        DEPLOY_SUCCESS=$?
    else
        print_warning "ios-deploy not found. Please install it:"
        echo "  npm install -g ios-deploy"
        echo ""
        print_status "Alternative: Use Xcode to deploy manually:"
        echo "  1. Open Xcode"
        echo "  2. Go to Window → Devices and Simulators"
        echo "  3. Select your Apple TV"
        echo "  4. Drag and drop the .app bundle to install"
        DEPLOY_SUCCESS=1
    fi

    # Clean up
    rm -rf "$EXTRACT_DIR"

    if [ $DEPLOY_SUCCESS -eq 0 ]; then
        print_success "App deployed successfully to Apple TV!"
    else
        print_error "Deployment failed"
        return 1
    fi
}

# Function to download latest build
download_latest_build() {
    print_status "Downloading latest iOS TV build..."
    
    if ! command_exists eas; then
        print_error "EAS CLI not found. Please install it:"
        echo "  npm install -g eas-cli"
        return 1
    fi
    
    # List recent builds and get the latest iOS build
    LATEST_BUILD=$(eas build:list --platform=ios --limit=1 --json | jq -r '.[0].id' 2>/dev/null || echo "")
    
    if [ -z "$LATEST_BUILD" ] || [ "$LATEST_BUILD" = "null" ]; then
        print_error "No iOS builds found. Please build your app first:"
        echo "  eas build --platform ios --profile production_tv_signed"
        return 1
    fi
    
    print_status "Downloading build: $LATEST_BUILD"
    eas build:download "$LATEST_BUILD"
    
    # Find the downloaded IPA file
    IPA_FILE=$(find . -name "*.ipa" -newer "$0" | head -n 1)
    
    if [ -z "$IPA_FILE" ]; then
        print_error "Downloaded IPA file not found"
        return 1
    fi
    
    print_success "Downloaded IPA file: $IPA_FILE"
    echo "$IPA_FILE"
}

# Main function
main() {
    echo "🍎 Apple TV Deployment Script"
    echo "=============================="
    echo ""

    # Check if we're on macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        print_error "This script requires macOS for Apple TV deployment"
        exit 1
    fi

    # Check for required tools
    if ! command_exists jq; then
        print_warning "jq not found. Installing via Homebrew..."
        if command_exists brew; then
            brew install jq
        else
            print_error "Please install jq manually: https://stedolan.github.io/jq/"
            exit 1
        fi
    fi

    # Parse arguments
    IPA_FILE=""
    DEVICE_UDID=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --udid)
                DEVICE_UDID="$2"
                shift 2
                ;;
            --help|-h)
                # Help will be handled before main is called
                shift
                ;;
            *)
                # Assume it's the IPA file
                if [ -z "$IPA_FILE" ]; then
                    IPA_FILE="$1"
                fi
                shift
                ;;
        esac
    done

    # Check Apple TV connection
    if ! check_apple_tv_connection; then
        exit 1
    fi

    # Determine IPA file source if not provided
    if [ -z "$IPA_FILE" ]; then
        # Try to find IPA file in current directory
        IPA_FILE=$(find . -name "*.ipa" | head -n 1)

        if [ -z "$IPA_FILE" ]; then
            # No IPA file found, try to download latest build
            print_status "No IPA file found locally. Attempting to download latest build..."
            IPA_FILE=$(download_latest_build)
        else
            print_success "Found IPA file: $IPA_FILE"
        fi
    fi

    if [ -z "$IPA_FILE" ]; then
        print_error "No IPA file available for deployment"
        exit 1
    fi

    # Deploy the IPA
    deploy_ipa "$IPA_FILE" "$DEVICE_UDID"
}

# Show usage if help requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [OPTIONS] [IPA_FILE]"
    echo ""
    echo "Deploy an iOS TV app to Apple TV with developer mode enabled."
    echo ""
    echo "Options:"
    echo "  --udid UDID    Deploy to a specific device with this UDID"
    echo "  -h, --help     Show this help message"
    echo ""
    echo "Arguments:"
    echo "  IPA_FILE       Path to the .ipa file to deploy (optional)"
    echo ""
    echo "If no IPA file is provided, the script will:"
    echo "  1. Look for .ipa files in the current directory"
    echo "  2. Download the latest build from EAS if none found"
    echo ""
    echo "Prerequisites:"
    echo "  - Apple TV connected via USB-C"
    echo "  - Developer Mode enabled on Apple TV"
    echo "  - EAS CLI installed (for downloading builds)"
    echo "  - ios-deploy installed (for deployment)"
    echo ""
    echo "Examples:"
    echo "  $0                                           # Auto-find or download IPA"
    echo "  $0 ./builds/my-app.ipa                      # Deploy specific IPA file"
    echo "  $0 --udid 00008027-001234567890001E         # Deploy to specific device"
    echo "  $0 --udid 00008027-001234567890001E my.ipa  # Deploy specific IPA to specific device"
    exit 0
fi

# Run main function
main "$@"
