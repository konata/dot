_device_file() {
  local root="$1"
  local source="$2"
  local target="${root}${source}"
  mkdir -p "$(dirname "$target")"
  adb pull "$source" "$target" >/dev/null 2>&1 && return
  adb exec-out su -c "cat '$source'" >"$target" 2>/dev/null && return
  rm -f "$target"
}

_device_state() {
  local root="$1"
  local file="$2"
  shift 2
  local target="${root}/${file}"
  mkdir -p "$(dirname "$target")"
  adb shell "$@" >"$target" 2>/dev/null || rm -f "$target"
}

clone() {
  local root="$1"
  [[ -n "$root" ]] || { echo "usage: clone ROOT" >&2; return 2; }
  mkdir -p "$root"

  adb shell '
    for partition in /system /system_ext /product /vendor /odm /apex; do
      [ -d "$partition" ] || continue
      find "$partition" -type f \( \
        -name "*.apk" -o -name "*.jar" -o -name "*.apex" -o \
        -name "*.xml" -o -name "*.rc" -o -name "*.json" -o -name "*.pb" \
      \) 2>/dev/null
    done
  ' | tr -d '\r' | sort -u | while read -r source; do
    [[ -n "$source" ]] || continue
    echo "Pulling: $source"
    _device_file "$root" "$source"
  done
}

snapshot() {
  local root="$1"
  [[ -n "$root" ]] || { echo "usage: snapshot ROOT" >&2; return 2; }
  mkdir -p "$root"

  _device_state "$root" permissions.txt pm list permissions -f
  _device_state "$root" systemuid.txt pm list packages -f --show-versioncode --uid 1000
  _device_state "$root" applications.txt pm list packages -f --show-versioncode -U
  _device_state "$root" prop.txt getprop
  _device_state "$root" packages.txt dumpsys package
  _device_state "$root" dumpsys.txt dumpsys
  _device_state "$root" services.txt service list
  _device_state "$root" dumpsys-services.txt dumpsys -l
  _device_state "$root" features.txt pm list features
  _device_state "$root" libraries.txt pm list libraries
  _device_state "$root" overlays.txt cmd overlay list
  _device_state "$root" roles.txt dumpsys role
  _device_state "$root" appops.txt dumpsys appops
  _device_state "$root" device-config.txt device_config list
  _device_state "$root" settings/global.txt settings list global
  _device_state "$root" settings/secure.txt settings list secure
  _device_state "$root" settings/system.txt settings list system
  _device_state "$root" users.txt pm list users
  _device_state "$root" user-list.txt cmd user list

  local users
  users="$(adb shell pm list users 2>/dev/null | tr -d '\r' | sed -n 's/.*UserInfo{\([0-9][0-9]*\):.*/\1/p')"
  [[ -n "$users" ]] || users=0

  echo "$users" | while read -r user; do
    [[ -n "$user" ]] || continue
    _device_state "$root" "users/${user}/packages.txt" pm list packages --user "$user" -f --show-versioncode -U
    _device_state "$root" "users/${user}/overlays.txt" cmd overlay list --user "$user"
    _device_state "$root" "users/${user}/appops.txt" dumpsys appops --user "$user"
    _device_state "$root" "users/${user}/roles.txt" dumpsys role --user "$user"
    _device_state "$root" "users/${user}/settings-global.txt" settings --user "$user" list global
    _device_state "$root" "users/${user}/settings-secure.txt" settings --user "$user" list secure
    _device_state "$root" "users/${user}/settings-system.txt" settings --user "$user" list system
  done

  local state='
    find /data/system -maxdepth 1 -type f \( \
      -name "packages.xml" -o -name "packages.list" -o -name "appops*.xml" \
    \) 2>/dev/null
    find /data/system/users -maxdepth 2 -type f \( \
      -name "package-restrictions.xml" -o -name "runtime-permissions.xml" -o \
      -name "roles.xml" -o -name "settings_*.xml" \
    \) 2>/dev/null
  '

  {
    adb shell "$state" 2>/dev/null
    adb shell "su -c '$state'" 2>/dev/null
  } | tr -d '\r' | sort -u | while read -r source; do
    [[ -n "$source" ]] || continue
    [[ "$source" == /* ]] || continue
    _device_file "$root" "$source"
  done
}

sps() {
  local p n
  if [[ -n "$1" ]]; then
    p="$(adb shell "service call $1 1599097156" | grep -o '00000[0-9a-f]*')" || return 1
    n="$(adb shell "ps -p $((16#${p:5})) -o NAME=" | tr -d '\r\n' | sed 's/^ *//;s/ *$//')"
    echo "$((16#${p:5})) $n"
    return
  fi

  for service in $(adb shell service list | awk -F'\t' 'NF>1{gsub(/:.*/,"",$2);print $2}'); do
    p="$(adb shell "service call $service 1599097156" | grep -o '00000[0-9a-f]*')" || continue
    n="$(adb shell "ps -p $((16#${p:5})) -o NAME=" | tr -d '\r\n' | sed 's/^ *//;s/ *$//')"
    echo "$service: $((16#${p:5})) $n"
  done
}

