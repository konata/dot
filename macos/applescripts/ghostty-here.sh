#!/bin/bash
# Ghostty Here — if Finder is frontmost, open Ghostty in its front window's
# directory; otherwise open Ghostty in home. Wire as a tinycast custom command
# (no arguments, output off; optionally a global hotkey).
dir=$(osascript <<'AS'
tell application "Finder"
  if frontmost then
    try
      return POSIX path of (target of front window as alias)
    end try
  end if
end tell
return POSIX path of (path to home folder)
AS
)
open -na Ghostty --args --working-directory="$dir"
