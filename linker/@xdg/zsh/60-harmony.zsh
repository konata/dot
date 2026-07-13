if [[ -z "${HARMONY_SDK:-}" ]]; then
  for sdk in "$HOME/Library/Huawei/Sdk" "$HOME/Huawei/Sdk" "$HOME/.local/share/Huawei/Sdk"; do
    [[ -d "$sdk" ]] || continue
    export HARMONY_SDK="$sdk"
    break
  done
fi

if [[ -n "${HARMONY_HOME:-${HARMONY_SDK:-}}" ]]; then
  export HARMONY_HOME="${HARMONY_HOME:-$HARMONY_SDK}"
  prepend-path "$HARMONY_HOME/default/openharmony/toolchains"
fi

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
