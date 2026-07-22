export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"

# Ignore incomplete SDK Manager directories and use the newest installed NDK.
autoload -Uz is-at-least
typeset ndk version latest
latest=
for ndk in "$ANDROID_HOME"/ndk/*(N/); do
  [[ -r "$ndk/source.properties" ]] || continue
  version="${ndk:t}"
  [[ -z "$latest" ]] || is-at-least "$latest" "$version" || continue
  latest="$version"
done
[[ -n "$latest" ]] && export NDK_HOME="$ANDROID_HOME/ndk/$latest" || unset NDK_HOME
unset ndk version latest

for tool in platform-tools build-tools/34.0.0 emulator cmdline-tools/latest/bin; do
  prepend-path "$ANDROID_HOME/$tool"
done

pick() {
  local serial
  case "$1" in
    emu)   serial="$(adb devices | awk '/^emulator-/{print $1; exit}')" ;;
    usb)   serial="$(adb devices | awk '$2=="device" && $1!~/^emulator-/ && $1!~/:/{print $1; exit}')" ;;
    unset) unset ANDROID_SERIAL; echo "ANDROID_SERIAL cleared"; return ;;
    "")    echo "pick emu|usb|<serial>|unset  (now: ${ANDROID_SERIAL:-none})"; return ;;
    *)     adb devices | grep -q "^$1[[:space:]]" || echo "warning: $1 not in adb devices"
           serial="$1" ;;
  esac
  [[ -n "$serial" ]] || { echo "no $1 device"; return 1; }
  export ANDROID_SERIAL="$serial"
  echo "ANDROID_SERIAL=$serial"
}

_activities() {
  adb shell dumpsys activity activities
}

tasks() {
  _activities | rg '\bHist\b'
}

comp() {
  tasks | awk 'NR == 1 { print $6; exit }'
}

pids() {
  _activities | rg '\bProcessRecord\b'
}

pkg() {
  comp | cut -d / -f 1
}

frag() {
  adb shell dumpsys activity "$(pkg)" | rg -i '^\s*#'
}

fatal() {
  adb logcat | rg -i 'fatal|androidruntime|uncaught|javabinder'
}

pulls() {
  local app apk
  app="$(pkg)"
  apk="$(adb shell pm path "$app" | cut -d : -f 2)"
  adb pull "$apk" "$app.apk"
}

recvs() {
  adb shell cmd package query-receivers --components -a "$@"
}

instr() {
  systrace -t 8 gfx input view sched freq wm am hwui workq res dalvik sync disk load perf hal rs idle mmc
}

tf() {
  adb shell dumpsys window | rg -i '\* (TaskFragment|Task|ActivityRecord)'
}

atm() {
  adb logcat | rg -i 'ActivityManager|ActivityTaskManager|fatal|androidruntime|uncaught|javabinder|ActivityStarter'
}
