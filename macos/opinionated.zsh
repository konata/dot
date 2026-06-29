#!/bin/zsh
set -euo pipefail

defaults write com.apple.sound.beep.feedback -bool false
defaults write com.apple.menuextra.battery ShowPercent YES
defaults write NSGlobalDomain NSAutomaticWindowAnimationsEnabled -bool false
defaults write com.apple.screencapture location -string "$HOME/Desktop"
defaults write NSGlobalDomain TISRomanSwitchState -int 1
hidutil property --set '{"CapsLockDelayOverride":0}' >/dev/null
defaults write com.apple.finder QuitMenuItem -bool true
defaults write com.apple.finder QLEnableTextSelection -bool true
defaults write com.apple.finder WarnOnEmptyTrash -bool false
defaults write com.apple.finder FXInfoPanesExpanded -dict General -bool true OpenWith -bool true Privileges -bool true

for app in Dock Finder SystemUIServer; do
  killall "$app" >/dev/null 2>&1 || true
done
