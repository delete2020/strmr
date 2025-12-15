#!/bin/bash

# IPA Re-sign and Deploy Script
# Re-signs an IPA file and deploys it to an iOS/tvOS device

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to list available signing identities
list_signing_identities() {
    print_status "Available signing identities:"
    security find-identity -v -p codesigning | grep -E "iPhone|Apple Development|Apple Distribution"
}

# Function to list available provisioning profiles
list_provisioning_profiles() {
    print_status "Available provisioning profiles:"
    PROFILES_DIR="$HOME/Library/MobileDevice/Provisioning Profiles"
    if [ -d "$PROFILES_DIR" ]; then
        for profile in "$PROFILES_DIR"/*.mobileprovision; do
            if [ -f "$profile" ]; then
                NAME=$(security cms -D -i "$profile" 2>/dev/null | plutil -extract Name raw - 2>/dev/null || echo "Unknown")
                UUID=$(basename "$profile" .mobileprovision)
                echo "  - $NAME ($UUID)"
            fi
        done
    else
        print_warning "No provisioning profiles directory found"
    fi
}

# Function to list available devices
list_devices() {
    print_status "Available devices:"

    # Try xcrun devicectl first (newer method)
    if command_exists xcrun; then
        DEVICES=$(xcrun devicectl list devices 2>/dev/null || true)
        if [ -n "$DEVICES" ]; then
            echo "$DEVICES"
            return 0
        fi
    fi

    # Fallback to instruments
    if command_exists instruments; then
        instruments -s devices 2>/dev/null | grep -v "Simulator" | grep -E "iPhone|iPad|Apple TV" || true
    fi
}

# Function to extract IPA
extract_ipa() {
    local IPA_FILE="$1"
    local EXTRACT_DIR="$2"

    print_status "Extracting IPA: $IPA_FILE"
    unzip -q "$IPA_FILE" -d "$EXTRACT_DIR"

    # Find the .app bundle
    APP_BUNDLE=$(find "$EXTRACT_DIR/Payload" -name "*.app" | head -n 1)

    if [ -z "$APP_BUNDLE" ]; then
        print_error "No .app bundle found in IPA"
        return 1
    fi

    print_success "Found app bundle: $(basename "$APP_BUNDLE")"
    echo "$APP_BUNDLE"
}

# Function to extract entitlements from app
extract_entitlements() {
    local APP_BUNDLE="$1"
    local ENTITLEMENTS_FILE="$2"

    print_status "Extracting entitlements from app..."

    # Find the actual binary name from Info.plist
    local APP_BINARY=""
    if [ -f "$APP_BUNDLE/Info.plist" ]; then
        local BINARY_NAME=$(/usr/libexec/PlistBuddy -c "Print :CFBundleExecutable" "$APP_BUNDLE/Info.plist" 2>/dev/null)
        if [ -n "$BINARY_NAME" ]; then
            APP_BINARY="$APP_BUNDLE/$BINARY_NAME"
            print_status "Found binary: $BINARY_NAME"
        fi
    fi

    # Fallback to .app name
    if [ -z "$APP_BINARY" ] || [ ! -f "$APP_BINARY" ]; then
        APP_BINARY="$APP_BUNDLE/$(basename "$APP_BUNDLE" .app)"
    fi

    if [ -f "$APP_BINARY" ]; then
        if /usr/bin/codesign -d --entitlements :- "$APP_BINARY" > "$ENTITLEMENTS_FILE" 2>/dev/null; then
            # Check if entitlements were extracted successfully
            if [ -s "$ENTITLEMENTS_FILE" ]; then
                # Remove the first line if it's XML declaration garbage (starts with [)
                if head -n 1 "$ENTITLEMENTS_FILE" 2>/dev/null | grep -q "^\[" 2>/dev/null; then
                    tail -n +2 "$ENTITLEMENTS_FILE" > "$ENTITLEMENTS_FILE.tmp" 2>/dev/null && mv "$ENTITLEMENTS_FILE.tmp" "$ENTITLEMENTS_FILE" 2>/dev/null || true
                fi

                print_success "Entitlements extracted from binary"
                return 0
            fi
        fi
    else
        print_warning "App binary not found at: $APP_BINARY"
    fi

    # Fallback: try to extract from provisioning profile
    if [ -f "$APP_BUNDLE/embedded.mobileprovision" ]; then
        print_status "Extracting entitlements from provisioning profile..."
        local TEMP_PROFILE="/tmp/profile_$$.plist"
        if security cms -D -i "$APP_BUNDLE/embedded.mobileprovision" > "$TEMP_PROFILE" 2>/dev/null; then
            if /usr/libexec/PlistBuddy -x -c "Print :Entitlements" "$TEMP_PROFILE" > "$ENTITLEMENTS_FILE" 2>/dev/null; then
                rm -f "$TEMP_PROFILE"

                if [ -s "$ENTITLEMENTS_FILE" ]; then
                    print_success "Entitlements extracted from provisioning profile"
                    return 0
                fi
            fi
        fi
        rm -f "$TEMP_PROFILE"
    fi

    print_warning "Could not extract entitlements, will attempt to create basic entitlements"

    # Create basic entitlements with application-identifier
    cat > "$ENTITLEMENTS_FILE" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>application-identifier</key>
    <string>$(AppIdentifierPrefix)$(CFBundleIdentifier)</string>
    <key>get-task-allow</key>
    <true/>
</dict>
</plist>
EOF

    if [ -s "$ENTITLEMENTS_FILE" ]; then
        print_success "Created basic entitlements file"
        return 0
    fi

    return 1
}

# Function to re-sign the app
resign_app() {
    local APP_BUNDLE="$1"
    local SIGNING_IDENTITY="$2"
    local PROVISIONING_PROFILE="$3"
    local NEW_BUNDLE_ID="$4"

    print_status "Re-signing app bundle..."

    # Change bundle ID if provided
    if [ -n "$NEW_BUNDLE_ID" ]; then
        print_status "Changing bundle ID to: $NEW_BUNDLE_ID"
        /usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier $NEW_BUNDLE_ID" "$APP_BUNDLE/Info.plist"
    fi

    # Extract entitlements before removing signature
    local ENTITLEMENTS_FILE="$APP_BUNDLE/../entitlements.plist"
    extract_entitlements "$APP_BUNDLE" "$ENTITLEMENTS_FILE" || true

    # Remove old signature
    rm -rf "$APP_BUNDLE/_CodeSignature" 2>/dev/null || true
    rm -f "$APP_BUNDLE/embedded.mobileprovision" 2>/dev/null || true

    # Copy new provisioning profile if provided
    if [ -n "$PROVISIONING_PROFILE" ]; then
        if [ -f "$PROVISIONING_PROFILE" ]; then
            print_status "Installing provisioning profile..."
            cp "$PROVISIONING_PROFILE" "$APP_BUNDLE/embedded.mobileprovision"
        else
            # Try to find it in the default location
            PROFILE_PATH="$HOME/Library/MobileDevice/Provisioning Profiles/$PROVISIONING_PROFILE.mobileprovision"
            if [ -f "$PROFILE_PATH" ]; then
                cp "$PROFILE_PATH" "$APP_BUNDLE/embedded.mobileprovision"
            else
                print_warning "Provisioning profile not found: $PROVISIONING_PROFILE"
            fi
        fi
    fi

    # Re-sign frameworks
    if [ -d "$APP_BUNDLE/Frameworks" ]; then
        print_status "Re-signing frameworks..."
        for framework in "$APP_BUNDLE/Frameworks"/*.framework; do
            if [ -d "$framework" ]; then
                /usr/bin/codesign --force --sign "$SIGNING_IDENTITY" "$framework" 2>/dev/null || true
            fi
        done
        for dylib in "$APP_BUNDLE/Frameworks"/*.dylib; do
            if [ -f "$dylib" ]; then
                /usr/bin/codesign --force --sign "$SIGNING_IDENTITY" "$dylib" 2>/dev/null || true
            fi
        done
    fi

    # Re-sign the app bundle with entitlements
    print_status "Signing app with identity: $SIGNING_IDENTITY"

    if [ -f "$ENTITLEMENTS_FILE" ] && [ -s "$ENTITLEMENTS_FILE" ]; then
        print_status "Using entitlements file"

        # Get bundle identifier from Info.plist
        local BUNDLE_ID=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$APP_BUNDLE/Info.plist" 2>/dev/null)

        if [ -n "$BUNDLE_ID" ]; then
            # Get Team ID from signing identity
            local TEAM_ID=$(security find-identity -v -p codesigning | grep "$SIGNING_IDENTITY" | head -n 1 | sed -n 's/.*(\([A-Z0-9]*\)).*/\1/p')

            if [ -n "$TEAM_ID" ]; then
                # Replace variables in entitlements if they exist
                sed -i '' "s/\$(AppIdentifierPrefix)/$TEAM_ID./g" "$ENTITLEMENTS_FILE" 2>/dev/null || true
                sed -i '' "s/\$(CFBundleIdentifier)/$BUNDLE_ID/g" "$ENTITLEMENTS_FILE" 2>/dev/null || true
                print_status "Team ID: $TEAM_ID, Bundle ID: $BUNDLE_ID"
            fi
        fi

        /usr/bin/codesign --force --sign "$SIGNING_IDENTITY" --entitlements "$ENTITLEMENTS_FILE" "$APP_BUNDLE"
    else
        print_warning "No entitlements file found, signing without entitlements (may fail)"
        /usr/bin/codesign --force --sign "$SIGNING_IDENTITY" "$APP_BUNDLE"
    fi

    # Verify signature
    if /usr/bin/codesign --verify --verbose "$APP_BUNDLE" 2>&1; then
        print_success "App re-signed successfully"
        return 0
    else
        print_error "Failed to verify signature"
        return 1
    fi
}

# Function to detect if app bundle is tvOS
is_tvos_app() {
    local APP_BUNDLE="$1"

    # Check Info.plist for platform identifier
    if [ -f "$APP_BUNDLE/Info.plist" ]; then
        # Check for tvOS platform
        if /usr/libexec/PlistBuddy -c "Print :DTPlatformName" "$APP_BUNDLE/Info.plist" 2>/dev/null | grep -iq "appletvos"; then
            return 0
        fi

        # Check for UIRequiredDeviceCapabilities
        if /usr/libexec/PlistBuddy -c "Print :UIRequiredDeviceCapabilities" "$APP_BUNDLE/Info.plist" 2>/dev/null | grep -iq "tv"; then
            return 0
        fi
    fi

    return 1
}

# Function to detect if device is tvOS
is_tvos_device() {
    local DEVICE_UDID="$1"

    if [ -z "$DEVICE_UDID" ]; then
        return 1
    fi

    # Check using xcrun devicectl
    if command_exists xcrun; then
        DEVICE_INFO=$(xcrun devicectl list devices 2>/dev/null | grep -i "$DEVICE_UDID" || true)
        if echo "$DEVICE_INFO" | grep -iq "Apple TV"; then
            return 0
        fi
    fi

    return 1
}

# Function to deploy to tvOS device using xcrun
deploy_to_tvos() {
    local APP_BUNDLE="$1"
    local DEVICE_UDID="$2"

    print_status "Deploying to Apple TV..."

    if ! command_exists xcrun; then
        print_error "xcrun not found. Xcode Command Line Tools required."
        return 1
    fi

    # Use xcrun devicectl to install
    print_status "Installing app on Apple TV with UDID: $DEVICE_UDID"

    # Try xcrun devicectl (Xcode 15+)
    if xcrun devicectl device install app --device "$DEVICE_UDID" "$APP_BUNDLE" 2>&1; then
        print_success "App installed successfully!"
        return 0
    else
        print_warning "xcrun devicectl failed. Trying alternative method..."

        # Alternative: Use cfgutil if available (Apple Configurator)
        if command_exists cfgutil; then
            print_status "Trying with cfgutil..."
            cfgutil -e "$DEVICE_UDID" install-app "$APP_BUNDLE"
            if [ $? -eq 0 ]; then
                print_success "App installed successfully!"
                return 0
            fi
        fi

        print_error "Deployment failed. Manual steps:"
        echo "  1. Open Xcode"
        echo "  2. Go to Window → Devices and Simulators"
        echo "  3. Select your Apple TV (UDID: $DEVICE_UDID)"
        echo "  4. Click the '+' button under Installed Apps"
        echo "  5. Select the app bundle at: $APP_BUNDLE"
        return 1
    fi
}

# Function to deploy to iOS device
deploy_to_ios() {
    local APP_BUNDLE="$1"
    local DEVICE_UDID="$2"

    if ! command_exists ios-deploy; then
        print_error "ios-deploy not found. Installing..."
        if command_exists npm; then
            npm install -g ios-deploy
        else
            print_error "npm not found. Please install ios-deploy manually:"
            echo "  npm install -g ios-deploy"
            return 1
        fi
    fi

    print_status "Deploying to iOS device..."

    if [ -n "$DEVICE_UDID" ]; then
        print_status "Deploying to device with UDID: $DEVICE_UDID"
        ios-deploy --bundle "$APP_BUNDLE" --id "$DEVICE_UDID" --no-wifi
    else
        print_status "Deploying to first available device"
        ios-deploy --bundle "$APP_BUNDLE" --no-wifi
    fi

    if [ $? -eq 0 ]; then
        print_success "App deployed successfully!"
        return 0
    else
        print_error "Deployment failed"
        return 1
    fi
}

# Function to deploy to device (detects device type)
deploy_to_device() {
    local APP_BUNDLE="$1"
    local DEVICE_UDID="$2"
    local FORCE_PLATFORM="$3"

    print_status "Deploying to device..."

    # Check for forced platform
    if [ "$FORCE_PLATFORM" = "tvos" ]; then
        print_status "Forcing tvOS deployment method"
        deploy_to_tvos "$APP_BUNDLE" "$DEVICE_UDID"
    elif [ "$FORCE_PLATFORM" = "ios" ]; then
        print_status "Forcing iOS deployment method"
        deploy_to_ios "$APP_BUNDLE" "$DEVICE_UDID"
    # Check if it's a tvOS app or tvOS device
    elif is_tvos_app "$APP_BUNDLE"; then
        print_status "Detected tvOS app bundle"
        deploy_to_tvos "$APP_BUNDLE" "$DEVICE_UDID"
    elif is_tvos_device "$DEVICE_UDID"; then
        print_status "Detected tvOS device"
        deploy_to_tvos "$APP_BUNDLE" "$DEVICE_UDID"
    else
        deploy_to_ios "$APP_BUNDLE" "$DEVICE_UDID"
    fi

    return $?
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS] IPA_FILE

Re-sign and deploy an IPA file to an iOS or tvOS device.

Options:
  --udid UDID           Deploy to specific device UDID
  --identity IDENTITY   Code signing identity (default: auto-detect)
  --profile PROFILE     Provisioning profile UUID or path
  --bundle-id ID        Change app bundle ID (e.g., com.yourname.app)
  --tvos                Force tvOS deployment method
  --ios                 Force iOS deployment method
  --list-identities     List available signing identities and exit
  --list-profiles       List available provisioning profiles and exit
  --list-devices        List available devices and exit
  --no-resign          Skip re-signing (deploy only)
  -h, --help           Show this help message

Arguments:
  IPA_FILE             Path to the .ipa file to deploy

Examples:
  # Deploy to first available device (auto-detect signing)
  $0 MyApp.ipa

  # Deploy to specific device
  $0 --udid 00008110-000A592C0200401E MyApp.ipa

  # Deploy to Apple TV (force tvOS method)
  $0 --tvos --udid 00008110-000A592C0200401E MyApp.ipa

  # Re-sign with specific identity and profile
  $0 --identity "Apple Development: Your Name" --profile ABC123 MyApp.ipa

  # Re-sign with a different bundle ID
  $0 --bundle-id com.yourname.newapp --profile ABC123 MyApp.ipa

  # Deploy without re-signing
  $0 --no-resign --udid 00008110-000A592C0200401E MyApp.ipa

  # List available signing options
  $0 --list-identities
  $0 --list-profiles
  $0 --list-devices

EOF
}

# Main function
main() {
    echo "🔐 IPA Re-sign and Deploy Script"
    echo "================================="
    echo ""

    # Check if we're on macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        print_error "This script requires macOS"
        exit 1
    fi

    # Parse arguments
    IPA_FILE=""
    DEVICE_UDID=""
    SIGNING_IDENTITY=""
    PROVISIONING_PROFILE=""
    NEW_BUNDLE_ID=""
    NO_RESIGN=false
    FORCE_PLATFORM=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --udid)
                DEVICE_UDID="$2"
                shift 2
                ;;
            --identity)
                SIGNING_IDENTITY="$2"
                shift 2
                ;;
            --profile)
                PROVISIONING_PROFILE="$2"
                shift 2
                ;;
            --bundle-id)
                NEW_BUNDLE_ID="$2"
                shift 2
                ;;
            --tvos)
                FORCE_PLATFORM="tvos"
                shift
                ;;
            --ios)
                FORCE_PLATFORM="ios"
                shift
                ;;
            --list-identities)
                list_signing_identities
                exit 0
                ;;
            --list-profiles)
                list_provisioning_profiles
                exit 0
                ;;
            --list-devices)
                list_devices
                exit 0
                ;;
            --no-resign)
                NO_RESIGN=true
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                if [ -z "$IPA_FILE" ]; then
                    IPA_FILE="$1"
                fi
                shift
                ;;
        esac
    done

    # Validate IPA file
    if [ -z "$IPA_FILE" ]; then
        print_error "No IPA file specified"
        show_usage
        exit 1
    fi

    if [ ! -f "$IPA_FILE" ]; then
        print_error "IPA file not found: $IPA_FILE"
        exit 1
    fi

    # Auto-detect signing identity if not provided and re-signing is needed
    if [ "$NO_RESIGN" = false ] && [ -z "$SIGNING_IDENTITY" ]; then
        print_status "Auto-detecting signing identity..."
        SIGNING_IDENTITY=$(security find-identity -v -p codesigning | grep "Apple Development" | head -n 1 | sed -n 's/.*"\(.*\)"/\1/p')

        if [ -z "$SIGNING_IDENTITY" ]; then
            print_warning "No signing identity found. Will attempt deployment without re-signing."
            NO_RESIGN=true
        else
            print_success "Using signing identity: $SIGNING_IDENTITY"
        fi
    fi

    # Create temporary directory
    TEMP_DIR=$(mktemp -d)
    trap "rm -rf $TEMP_DIR" EXIT

    # Extract IPA
    APP_BUNDLE=$(extract_ipa "$IPA_FILE" "$TEMP_DIR")

    if [ $? -ne 0 ]; then
        exit 1
    fi

    # Re-sign if needed
    if [ "$NO_RESIGN" = false ]; then
        resign_app "$APP_BUNDLE" "$SIGNING_IDENTITY" "$PROVISIONING_PROFILE" "$NEW_BUNDLE_ID"

        if [ $? -ne 0 ]; then
            print_warning "Re-signing failed. Attempting deployment with original signature..."
        fi
    else
        print_status "Skipping re-signing (--no-resign specified)"
    fi

    # Deploy to device
    deploy_to_device "$APP_BUNDLE" "$DEVICE_UDID" "$FORCE_PLATFORM"

    if [ $? -eq 0 ]; then
        print_success "✨ All done!"
    else
        exit 1
    fi
}

# Run main function
main "$@"
