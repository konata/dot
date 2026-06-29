export HARMONY_SDK="${HARMONY_SDK:-$HOME/Library/Huawei/Sdk}"
export HARMONY_HOME="${HARMONY_HOME:-$HARMONY_SDK}"
export HARMONY_SDK_VERSION="${HARMONY_SDK_VERSION:-3.0.0_7}"

prepend-path "$HARMONY_HOME/default/openharmony/toolchains"
prepend-path "/Applications/Huawei Studio.app/Contents/sdk/default/openharmony/toolchains"

hicat() {
  {
    adb logcat -b all | sed $'s/^/\033[32m[adb]\033[0m /' &
    local adb_pid=$!
    hdc hilog | sed $'s/^/\033[36m[hdc]\033[0m /' &
    local hdc_pid=$!
    trap "kill $adb_pid $hdc_pid 2>/dev/null" INT
    wait "$adb_pid" "$hdc_pid"
  } | cat
}

