#!/usr/bin/osascript

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Merge Finder Windows
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 🗂
# @raycast.packageName Finder

tell application "Finder" to activate

tell application "System Events"
	repeat 30 times
		if frontmost of process "Finder" then exit repeat
		delay 0.05
	end repeat

	tell process "Finder"
		try
			set mergeItem to menu item "Merge All Windows" of menu "Window" of menu bar item "Window" of menu bar 1
		on error
			try
				set mergeItem to menu item "合并所有窗口" of menu "窗口" of menu bar item "窗口" of menu bar 1
			on error
				return
			end try
		end try

		if enabled of mergeItem then click mergeItem
	end tell
end tell
