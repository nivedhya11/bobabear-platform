#!/bin/sh
# BOBA Bear web-runtime: generate Nginx resolver from container /etc/resolv.conf.
# Invoked by the official nginx image entrypoint (/docker-entrypoint.d/) before
# `nginx` starts. Fail closed if no usable nameserver can be derived.
#
# vim:sw=2:ts=2:sts=2:et

set -eu

ME=$(basename "$0")
RESOLV_CONF=/etc/resolv.conf
OUT=/tmp/boba-nginx-resolver.conf

entrypoint_log() {
  if [ -z "${NGINX_ENTRYPOINT_QUIET_LOGS:-}" ]; then
    echo "$@"
  fi
}

if [ ! -r "$RESOLV_CONF" ]; then
  echo "$ME: error: cannot read $RESOLV_CONF" >&2
  exit 1
fi

# Collect nameserver addresses only (ignore search/domain/options).
# Validate each token before emitting Nginx syntax — never pass through
# arbitrary resolv.conf or environment text.
nameservers=
while read -r keyword addr _rest; do
  [ "${keyword:-}" = "nameserver" ] || continue
  [ -n "${addr:-}" ] || continue

  case "$addr" in
    *:*)
      # IPv6 — hex and colon only; Nginx requires brackets.
      case "$addr" in
        *[!0-9a-fA-F:]*)
          echo "$ME: error: rejecting invalid IPv6 nameserver token" >&2
          exit 1
          ;;
      esac
      formatted="[$addr]"
      ;;
    *)
      # IPv4 — digits and dots only, exactly four octets in 0–255.
      case "$addr" in
        *[!0-9.]*)
          echo "$ME: error: rejecting invalid IPv4 nameserver token" >&2
          exit 1
          ;;
      esac
      if ! printf '%s\n' "$addr" | awk -F. '
        NF != 4 { exit 1 }
        {
          for (i = 1; i <= 4; i++) {
            if ($i !~ /^[0-9]+$/ || $i + 0 > 255) exit 1
          }
        }
      '; then
        echo "$ME: error: rejecting malformed IPv4 nameserver" >&2
        exit 1
      fi
      formatted="$addr"
      ;;
  esac

  if [ -z "$nameservers" ]; then
    nameservers="$formatted"
  else
    nameservers="$nameservers $formatted"
  fi
done < "$RESOLV_CONF"

if [ -z "$nameservers" ]; then
  echo "$ME: error: no usable nameserver entries in $RESOLV_CONF" >&2
  exit 1
fi

umask 022
{
  printf '%s\n' "# Generated at container start from ${RESOLV_CONF}; do not edit."
  # Single resolver directive; $nameservers is a space-separated list of
  # validated address tokens only (never raw env or resolv.conf text).
  printf 'resolver %s valid=10s ipv6=off;\n' "$nameservers"
} > "$OUT"
chmod 644 "$OUT"

entrypoint_log "$ME: wrote runtime resolver fragment to $OUT"
