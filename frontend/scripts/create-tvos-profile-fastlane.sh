#!/bin/bash

# Create tvOS Provisioning Profile using Fastlane Match/Sigh
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_usage() {
    cat << EOF
Usage: $0 --udid UDID [OPTIONS]

Options:
  --udid UDID           Apple TV UDID (required)
  --bundle-id ID        Bundle ID (default: wildcard '*')
  --device-name NAME    Device name (default: 'Apple TV')
  --help                Show this help

Example:
  $0 --udid 00008110-000A592C0200401E --bundle-id "*"
EOF
}

# Parse arguments
UDID=""
BUNDLE_ID="*"
DEVICE_NAME="Apple TV"

while [[ $# -gt 0 ]]; do
    case $1 in
        --udid) UDID="$2"; shift 2;;
        --bundle-id) BUNDLE_ID="$2"; shift 2;;
        --device-name) DEVICE_NAME="$2"; shift 2;;
        --help|-h) show_usage; exit 0;;
        *) print_error "Unknown option: $1"; show_usage; exit 1;;
    esac
done

if [ -z "$UDID" ]; then
    print_error "UDID is required"
    show_usage
    exit 1
fi

echo "🔐 tvOS Provisioning Profile Creator (Fastlane)"
echo "================================================"
echo ""

# Check if fastlane is installed
if ! command -v fastlane &> /dev/null; then
    print_error "Fastlane not found. Install with: brew install fastlane"
    exit 1
fi

# Create temporary Fastfile
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

cat > "$TEMP_DIR/Fastfile" << 'FASTFILE_EOF'
platform :tvos do
  desc "Create tvOS development provisioning profile"
  lane :create_profile do |options|
    udid = options[:udid]
    bundle_id = options[:bundle_id]
    device_name = options[:device_name]

    # Register device
    register_devices(
      devices: {
        device_name => udid
      },
      platform: "appletvos"
    )

    # Create/update provisioning profile
    sigh(
      platform: "appletvos",
      app_identifier: bundle_id,
      development: true,
      force: true,
      filename: "tvos_development.mobileprovision"
    )
  end
end
FASTFILE_EOF

print_status "Running fastlane to create provisioning profile..."
print_status "You will be prompted for your Apple ID credentials"
echo ""

cd "$TEMP_DIR"

# Run fastlane
if fastlane tvos create_profile udid:"$UDID" bundle_id:"$BUNDLE_ID" device_name:"$DEVICE_NAME"; then
    print_success "Provisioning profile created successfully!"

    # Fastlane saves profiles in multiple possible locations, check all
    POSSIBLE_LOCATIONS=(
        "$TEMP_DIR/tvos_development.mobileprovision"
        "$TEMP_DIR/*.mobileprovision"
        "$PWD/tvos_development.mobileprovision"
        "$PWD/*.mobileprovision"
        "$HOME/Library/MobileDevice/Provisioning Profiles/*.mobileprovision"
    )

    PROFILE_PATH=""
    for loc in "${POSSIBLE_LOCATIONS[@]}"; do
        FOUND=$(ls $loc 2>/dev/null | head -1)
        if [ -n "$FOUND" ] && [ -f "$FOUND" ]; then
            # Get the most recently modified one
            if [ -z "$PROFILE_PATH" ] || [ "$FOUND" -nt "$PROFILE_PATH" ]; then
                PROFILE_PATH="$FOUND"
            fi
        fi
    done

    if [ -n "$PROFILE_PATH" ] && [ -f "$PROFILE_PATH" ]; then
        print_status "Found profile at: $PROFILE_PATH"

        # Get UUID from profile
        UUID=$(security cms -D -i "$PROFILE_PATH" 2>/dev/null | plutil -extract UUID raw - 2>/dev/null)

        if [ -z "$UUID" ]; then
            # Fallback method
            UUID=$(grep -a -A 1 UUID "$PROFILE_PATH" | grep -o '[A-Z0-9-]\{36\}' | head -1)
        fi

        if [ -n "$UUID" ]; then
            # Copy to provisioning profiles directory
            DEST_DIR="$HOME/Library/MobileDevice/Provisioning Profiles"
            mkdir -p "$DEST_DIR"
            cp "$PROFILE_PATH" "$DEST_DIR/$UUID.mobileprovision"

            print_success "Provisioning profile installed: $UUID"
            echo ""
            echo "✨ Profile UUID: $UUID"
            echo ""
            echo "Use with:"
            echo "  ./resign-and-deploy.sh --udid $UDID --profile $UUID mutube.ipa"
        else
            print_error "Could not extract UUID from profile"
            exit 1
        fi
    else
        print_warning "Profile created but could not find file in expected locations"
        print_status "Checking system provisioning profiles directory..."

        # List the most recent profile
        RECENT_PROFILE=$(ls -t "$HOME/Library/MobileDevice/Provisioning Profiles"/*.mobileprovision 2>/dev/null | head -1)

        if [ -n "$RECENT_PROFILE" ]; then
            UUID=$(basename "$RECENT_PROFILE" .mobileprovision)
            print_success "Found most recent profile: $UUID"
            echo ""
            echo "✨ Profile UUID: $UUID"
            echo ""
            echo "Use with:"
            echo "  ./resign-and-deploy.sh --udid $UDID --profile $UUID mutube.ipa"
        else
            print_error "Could not locate provisioning profile"
            exit 1
        fi
    fi
else
    print_error "Failed to create provisioning profile"
    exit 1
fi
