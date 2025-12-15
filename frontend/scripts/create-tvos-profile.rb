#!/usr/bin/env ruby

require 'spaceship'
require 'fileutils'

# Colors for output
class String
  def red; "\e[31m#{self}\e[0m"; end
  def green; "\e[32m#{self}\e[0m"; end
  def yellow; "\e[33m#{self}\e[0m"; end
  def blue; "\e[34m#{self}\e[0m"; end
end

def print_status(msg)
  puts "[INFO] #{msg}".blue
end

def print_success(msg)
  puts "[SUCCESS] #{msg}".green
end

def print_error(msg)
  puts "[ERROR] #{msg}".red
end

def print_warning(msg)
  puts "[WARNING] #{msg}".yellow
end

puts "🔐 tvOS Provisioning Profile Creator"
puts "======================================"
puts ""

# Get parameters
if ARGV.length < 2
  puts "Usage: #{$0} <DEVICE_UDID> <DEVICE_NAME> [BUNDLE_ID]"
  puts ""
  puts "Examples:"
  puts "  #{$0} 00008110-000A592C0200401E 'Apple TV' '*'"
  puts "  #{$0} 00008110-000A592C0200401E 'Apple TV' com.google.ios.youtube"
  exit 1
end

device_udid = ARGV[0]
device_name = ARGV[1]
bundle_id = ARGV[2] || '*'  # Default to wildcard

# Prompt for Apple ID credentials
print "Apple ID: "
apple_id = $stdin.gets.chomp

print "Password (or App-Specific Password): "
system "stty -echo"
password = $stdin.gets.chomp
system "stty echo"
puts ""

begin
  print_status "Logging in to Apple Developer Portal..."
  Spaceship::Portal.login(apple_id, password)
  print_success "Logged in successfully!"

  # Select team if multiple teams
  teams = Spaceship::Portal.client.teams
  if teams.count > 1
    puts "\nAvailable teams:"
    teams.each_with_index do |team, index|
      puts "  #{index + 1}. #{team['name']} (#{team['teamId']})"
    end
    print "Select team (1-#{teams.count}): "
    team_index = $stdin.gets.chomp.to_i - 1
    Spaceship::Portal.client.team_id = teams[team_index]['teamId']
    print_success "Selected team: #{teams[team_index]['name']}"
  end

  team_id = Spaceship::Portal.client.team_id
  print_status "Team ID: #{team_id}"

  # Register device
  print_status "Checking if device is registered..."
  device = Spaceship::Portal.device.find_by_udid(device_udid, mac: false, include_disabled: false)

  if device.nil?
    print_status "Registering new device: #{device_name} (#{device_udid})"
    device = Spaceship::Portal.device.create!(
      name: device_name,
      udid: device_udid,
      mac: false  # This is an iOS/tvOS device, not a Mac
    )
    print_success "Device registered successfully!"
  else
    print_success "Device already registered: #{device.name}"
  end

  # Find or create App ID
  print_status "Looking for App ID: #{bundle_id}"

  app_id = nil
  if bundle_id == '*'
    # Look for wildcard app ID
    app_id = Spaceship::Portal.app.find('*')

    if app_id.nil?
      print_status "Creating wildcard App ID..."
      app_id = Spaceship::Portal.app.create!(
        bundle_id: '*',
        name: 'Wildcard App ID'
      )
      print_success "Wildcard App ID created!"
    else
      print_success "Found existing wildcard App ID"
    end
  else
    # Look for specific bundle ID
    app_id = Spaceship::Portal.app.find(bundle_id)

    if app_id.nil?
      print_warning "App ID not found: #{bundle_id}"
      print_status "Creating App ID: #{bundle_id}"
      app_id = Spaceship::Portal.app.create!(
        bundle_id: bundle_id,
        name: bundle_id.split('.').last.capitalize
      )
      print_success "App ID created!"
    else
      print_success "Found existing App ID: #{app_id.name}"
    end
  end

  # Find development certificate
  print_status "Looking for development certificate..."
  certs = Spaceship::Portal.certificate.development.all

  if certs.empty?
    print_error "No development certificates found!"
    print_error "Please create a development certificate in the Apple Developer Portal first."
    exit 1
  end

  cert = certs.first
  print_success "Using certificate: #{cert.name} (#{cert.id})"

  # Get all tvOS devices
  print_status "Getting all registered tvOS devices..."
  all_devices = Spaceship::Portal.device.all_apple_tvs
  print_success "Found #{all_devices.count} registered tvOS device(s)"

  # Create provisioning profile
  profile_name = "tvOS Development #{bundle_id} #{Time.now.strftime('%Y%m%d')}"
  print_status "Creating provisioning profile: #{profile_name}"

  profile = Spaceship::Portal.provisioning_profile.development.create!(
    bundle_id: app_id.bundle_id,
    certificate: cert,
    name: profile_name,
    devices: all_devices
  )

  print_success "Provisioning profile created: #{profile.uuid}"

  # Download provisioning profile
  profile_path = File.expand_path("~/Library/MobileDevice/Provisioning Profiles")
  FileUtils.mkdir_p(profile_path)

  profile_file = File.join(profile_path, "#{profile.uuid}.mobileprovision")
  File.write(profile_file, profile.download)

  print_success "Provisioning profile downloaded to: #{profile_file}"
  print_success "Profile UUID: #{profile.uuid}"

  puts ""
  puts "✨ All done! You can now use this profile with:"
  puts "  ./resign-and-deploy.sh --udid #{device_udid} --profile #{profile.uuid} mutube.ipa"

rescue Spaceship::Client::UnexpectedResponse => e
  print_error "Authentication failed or unexpected response from Apple"
  print_error e.message
  exit 1
rescue => e
  print_error "An error occurred: #{e.message}"
  puts e.backtrace.join("\n").red if ENV['DEBUG']
  exit 1
end
