#!/bin/bash

# Apple Developer Credentials Setup Script
# This script helps set up Apple Developer credentials for EAS builds

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

# Function to validate Apple ID
validate_apple_id() {
    local apple_id="$1"
    if [[ "$apple_id" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 0
    else
        return 1
    fi
}

# Function to setup EAS credentials
setup_eas_credentials() {
    print_status "Setting up EAS credentials for iOS..."
    
    if ! command_exists eas; then
        print_error "EAS CLI not found. Please install it first:"
        echo "  npm install -g eas-cli"
        exit 1
    fi
    
    # Check if user is logged in to EAS
    if ! eas whoami >/dev/null 2>&1; then
        print_status "Please log in to EAS first:"
        echo "  eas login"
        read -p "Press Enter after logging in..."
    fi
    
    # Configure credentials
    print_status "Configuring iOS credentials..."
    eas credentials
    
    print_success "EAS credentials configured!"
}

# Function to setup GitHub secrets
setup_github_secrets() {
    print_status "Setting up GitHub secrets..."
    
    echo "You need to add the following secrets to your GitHub repository:"
    echo ""
    echo "1. Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions"
    echo "2. Add these secrets:"
    echo ""
    
    # Get Expo token
    if command_exists eas; then
        EXPO_TOKEN=$(eas whoami 2>/dev/null | grep -o 'token: [^[:space:]]*' | cut -d' ' -f2 || echo "")
        if [ -n "$EXPO_TOKEN" ]; then
            echo "   EXPO_TOKEN = $EXPO_TOKEN"
        else
            echo "   EXPO_TOKEN = (run 'eas whoami' to get your token)"
        fi
    else
        echo "   EXPO_TOKEN = (install EAS CLI and run 'eas whoami')"
    fi
    
    echo ""
    echo "   APPLE_ID = your_apple_id@example.com"
    echo "   APPLE_ID_PASSWORD = your_app_specific_password"
    echo "   APPLE_TEAM_ID = your_team_id"
    echo ""
    echo "To get your Apple Team ID:"
    echo "  1. Go to https://developer.apple.com/account/"
    echo "  2. Look at the top right corner for your Team ID"
    echo ""
    echo "To create an app-specific password:"
    echo "  1. Go to https://appleid.apple.com/"
    echo "  2. Sign in with your Apple ID"
    echo "  3. Go to Security section"
    echo "  4. Generate an app-specific password for 'EAS Build'"
    echo ""
}

# Function to validate setup
validate_setup() {
    print_status "Validating setup..."
    
    local errors=0
    
    # Check EAS CLI
    if ! command_exists eas; then
        print_error "EAS CLI not installed"
        errors=$((errors + 1))
    else
        print_success "EAS CLI installed"
    fi
    
    # Check if logged in to EAS
    if command_exists eas; then
        if eas whoami >/dev/null 2>&1; then
            print_success "Logged in to EAS"
        else
            print_error "Not logged in to EAS"
            errors=$((errors + 1))
        fi
    fi
    
    # Check if credentials are configured
    if command_exists eas; then
        if eas credentials --platform ios >/dev/null 2>&1; then
            print_success "iOS credentials configured"
        else
            print_warning "iOS credentials not configured (run 'eas credentials')"
        fi
    fi
    
    # Check for app.json
    if [ -f "app.json" ]; then
        print_success "app.json found"
        
        # Check bundle identifier
        BUNDLE_ID=$(grep -o '"bundleIdentifier": "[^"]*"' app.json | cut -d'"' -f4 || echo "")
        if [ -n "$BUNDLE_ID" ]; then
            print_success "Bundle identifier: $BUNDLE_ID"
        else
            print_warning "Bundle identifier not found in app.json"
        fi
    else
        print_error "app.json not found"
        errors=$((errors + 1))
    fi
    
    # Check for eas.json
    if [ -f "eas.json" ]; then
        print_success "eas.json found"
    else
        print_error "eas.json not found"
        errors=$((errors + 1))
    fi
    
    if [ $errors -eq 0 ]; then
        print_success "Setup validation passed!"
        return 0
    else
        print_error "Setup validation failed with $errors errors"
        return 1
    fi
}

# Function to show next steps
show_next_steps() {
    echo ""
    echo "🎉 Setup Complete! Next Steps:"
    echo "=============================="
    echo ""
    echo "1. 📱 Build your app:"
    echo "   eas build --platform ios --profile production_tv_signed"
    echo ""
    echo "2. 🍎 Deploy to Apple TV:"
    echo "   ./scripts/deploy-to-apple-tv.sh"
    echo ""
    echo "3. 🚀 Use GitHub Actions:"
    echo "   - Go to Actions tab in your GitHub repository"
    echo "   - Run 'Apple TV Deployment' workflow"
    echo ""
    echo "4. 📚 Read the full guide:"
    echo "   ../APPLE_TV_DEPLOYMENT.md"
    echo ""
}

# Main function
main() {
    echo "🍎 Apple Developer Credentials Setup"
    echo "===================================="
    echo ""
    
    # Check if we're in the frontend directory
    if [ ! -f "app.json" ] || [ ! -f "eas.json" ]; then
        print_error "Please run this script from the frontend directory"
        echo "Usage: cd frontend && ./scripts/setup-apple-credentials.sh"
        exit 1
    fi
    
    # Parse command line arguments
    case "${1:-}" in
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Set up Apple Developer credentials for EAS builds"
            echo ""
            echo "Options:"
            echo "  --help, -h     Show this help message"
            echo "  --validate     Only validate current setup"
            echo "  --secrets      Only show GitHub secrets setup"
            echo ""
            exit 0
            ;;
        --validate)
            validate_setup
            exit $?
            ;;
        --secrets)
            setup_github_secrets
            exit 0
            ;;
    esac
    
    # Run setup steps
    print_status "Starting Apple Developer credentials setup..."
    echo ""
    
    # Validate current setup
    if validate_setup; then
        print_success "Setup already complete!"
        show_next_steps
        exit 0
    fi
    
    # Setup EAS credentials
    setup_eas_credentials
    
    # Show GitHub secrets setup
    setup_github_secrets
    
    # Final validation
    echo ""
    print_status "Running final validation..."
    if validate_setup; then
        show_next_steps
    else
        print_error "Setup incomplete. Please fix the errors above and run again."
        exit 1
    fi
}

# Run main function
main "$@"
