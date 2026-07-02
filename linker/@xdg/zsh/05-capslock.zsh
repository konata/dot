(( $+commands[hidutil] )) || return

# This runtime HID setting can disappear after reboot; keep direct Caps Lock
# input-source switching snappy without remapping Caps Lock to Globe/Fn.
hidutil property --set '{"CapsLockDelayOverride":0}' >/dev/null 2>&1
