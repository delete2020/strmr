#!/bin/bash

# Complete tvOS Setup and Deployment Script
# This script will:
# 1. Create a provisioning profile for tvOS development
# 2. Re-sign the IPA with the new profile
# 3. Deploy to your Apple TV

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

show_usage() {
    cat << EOF
Usage: $0 --udid UDID --ipa IPA_FILE [OPTIONS]

Complete setup and deployment for tvOS apps. This script will:
1. Register your device with Apple Developer Portal
2. Create a tvOS development provisioning profile
3. Re-sign your IPA with the new profile
4. Deploy to your Apple TV

Required Options:
  --udid UDID         Apple TV UDID
  --ipa IPA_FILE      Path to the .ipa file

Optional:
  --bundle-id ID      Bundle ID (default: wildcard '*')
  --device-name NAME  Device name for registration (default: 'Apple TV')
  --skip-profile      Skip profile creation (use existing)
  --help              Show this help

Examples:
  # Create profile and deploy with wildcard bundle ID
  $0 --udid 00008110-000A592C0200401E --ipa mutube.ipa

  # Create profile for specific bundle ID
  $0 --udid 00008110-000A592C0200401E --ipa mutube.ipa --bundle-id com.google.ios.youtube

  # Deploy using existing profile (skip creation)
  $0 --udid 00008110-000A592C0200401E --ipa mutube.ipa --skip-profile

EOF
}

# Parse arguments
UDID=""
IPA_FILE=""
BUNDLE_ID="*"
DEVICE_NAME="Apple TV"
SKIP_PROFILE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --udid)
            UDID="$2"
            shift 2
            ;;
        --ipa)
            IPA_FILE="$2"
            shift 2
            ;;
        --bundle-id)
            BUNDLE_ID="$2"
            shift 2
            ;;
        --device-name)
            DEVICE_NAME="$2"
            shift 2
            ;;
        --skip-profile)
            SKIP_PROFILE=true
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate required arguments
if [ -z "$UDID" ] || [ -z "$IPA_FILE" ]; then
    print_error "Missing required arguments"
    show_usage
    exit 1
fi

if [ ! -f "$IPA_FILE" ]; then
    print_error "IPA file not found: $IPA_FILE"
    exit 1
fi

echo "🚀 Complete tvOS Setup and Deployment"
echo "======================================"
echo ""
print_status "Device UDID: $UDID"
print_status "IPA File: $IPA_FILE"
print_status "Bundle ID: $BUNDLE_ID"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

PROFILE_UUID=""

if [ "$SKIP_PROFILE" = false ]; then
    # Step 1: Create provisioning profile
    print_status "Step 1: Creating tvOS provisioning profile..."
    echo ""

    if [ ! -f "$SCRIPT_DIR/create-tvos-profile-fastlane.sh" ]; then
        print_error "create-tvos-profile-fastlane.sh not found in $SCRIPT_DIR"
        exit 1
    fi

    # Run the fastlane script and capture the UUID from output
    OUTPUT=$("$SCRIPT_DIR/create-tvos-profile-fastlane.sh" --udid "$UDID" --bundle-id "$BUNDLE_ID" --device-name "$DEVICE_NAME" 2>&1)
    echo "$OUTPUT"

    # Extract UUID from output
    PROFILE_UUID=$(echo "$OUTPUT" | grep "Profile UUID:" | sed 's/.*Profile UUID: //' | tr -d '[:space:]')

    if [ -z "$PROFILE_UUID" ]; then
        print_error "Failed to create provisioning profile"
        exit 1
    fi

    print_success "Provisioning profile created: $PROFILE_UUID"
    echo ""
else
    print_status "Skipping profile creation (--skip-profile specified)"
    print_status "Using existing provisioning profiles..."
    echo ""
fi

# Step 2: Re-sign and deploy
print_status "Step 2: Re-signing and deploying IPA..."
echo ""

if [ ! -f "$SCRIPT_DIR/resign-and-deploy.sh" ]; then
    print_error "resign-and-deploy.sh not found in $SCRIPT_DIR"
    exit 1
fi

if [ -n "$PROFILE_UUID" ]; then
    # Use the newly created profile
    "$SCRIPT_DIR/resign-and-deploy.sh" --udid "$UDID" --profile "$PROFILE_UUID" "$IPA_FILE"
else
    # No profile specified, let resign script handle it
    "$SCRIPT_DIR/resign-and-deploy.sh" --udid "$UDID" "$IPA_FILE"
fi

if [ $? -eq 0 ]; then
    echo ""
    print_success "🎉 Setup and deployment completed successfully!"
else
    echo ""
    print_error "Deployment failed. See errors above."
    exit 1
fi
