#!/usr/bin/env bash

umask 077

LOG="${KEEPALIVE_LOG:-/home/devforge/keepalive.log}"
URL="${KEEPALIVE_URL:-https://mojaordinacija.mk/api/health}"
SLOW_LIMIT_SECONDS=5

{
    STARTED_AT="$(date -u '+%Y-%m-%dT%H:%M:%S.%NZ')"
    printf '\n--- Keepalive started ---\n'
    printf 'request_start=%s\n' "$STARTED_AT"
    printf 'probe_pid=%s\n' "$$"
    printf 'probe_target=public-health\n'

    case "$URL" in
        http://*|https://*) ;;
        *)
            printf 'RESULT=CONFIG_ERROR\n'
            printf 'request_end=%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%S.%NZ')"
            printf '%s\n' '--- End ---'
            exit 2
            ;;
    esac
    case "$URL" in
        *'@'*|*'?'*|*'#'*)
            printf 'RESULT=CONFIG_ERROR\n'
            printf 'request_end=%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%S.%NZ')"
            printf '%s\n' '--- End ---'
            exit 2
            ;;
    esac

    # Keep the write-out format on one source line so deployment/editor wrapping
    # cannot turn its fields into shell commands.
    WRITE_OUT='http_code=%{http_code}\nremote_ip=%{remote_ip}\nhttp_version=%{http_version}\nnum_connects=%{num_connects}\nnum_redirects=%{num_redirects}\nsize_download=%{size_download}\nssl_verify_result=%{ssl_verify_result}\ntime_namelookup=%{time_namelookup}\ntime_connect=%{time_connect}\ntime_appconnect=%{time_appconnect}\ntime_pretransfer=%{time_pretransfer}\ntime_starttransfer=%{time_starttransfer}\ntime_total=%{time_total}\ntime_redirect=%{time_redirect}\n'
    CURL_VERSION="$(curl -q --version 2>/dev/null | sed -n '1s/^curl \([^ ]*\).*/\1/p')"
    printf 'curl_version=%s\n' "${CURL_VERSION:-unknown}"

    METRICS="$(curl -q --silent --show-error --location --max-time 60 \
        --output /dev/null \
        --write-out "$WRITE_OUT" \
        "$URL")"
    CURL_EXIT=$?

    printf '%s\n' "$METRICS"
    printf 'curl_exit=%s\n' "$CURL_EXIT"
    printf 'request_end=%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%S.%NZ')"

    HTTP_CODE=''
    REMOTE_IP=''
    HTTP_VERSION=''
    NUM_CONNECTS=''
    REDIRECT_COUNT=''
    DOWNLOAD_SIZE=''
    SSL_VERIFY_RESULT=''
    DNS_SECONDS=''
    CONNECT_SECONDS=''
    APPCONNECT_SECONDS=''
    PRETRANSFER_SECONDS=''
    TTFB_SECONDS=''
    TOTAL_SECONDS=''
    REDIRECT_SECONDS=''

    while IFS='=' read -r KEY VALUE; do
        case "$KEY" in
            http_code) HTTP_CODE="$VALUE" ;;
            remote_ip) REMOTE_IP="$VALUE" ;;
            http_version) HTTP_VERSION="$VALUE" ;;
            num_connects) NUM_CONNECTS="$VALUE" ;;
            num_redirects) REDIRECT_COUNT="$VALUE" ;;
            size_download) DOWNLOAD_SIZE="$VALUE" ;;
            ssl_verify_result) SSL_VERIFY_RESULT="$VALUE" ;;
            time_namelookup) DNS_SECONDS="$VALUE" ;;
            time_connect) CONNECT_SECONDS="$VALUE" ;;
            time_appconnect) APPCONNECT_SECONDS="$VALUE" ;;
            time_pretransfer) PRETRANSFER_SECONDS="$VALUE" ;;
            time_starttransfer) TTFB_SECONDS="$VALUE" ;;
            time_total) TOTAL_SECONDS="$VALUE" ;;
            time_redirect) REDIRECT_SECONDS="$VALUE" ;;
        esac
    done <<< "$METRICS"

    if [[ "$REDIRECT_COUNT" =~ ^0$ &&
          "$DNS_SECONDS" =~ ^[0-9]+([.][0-9]+)?$ &&
          "$CONNECT_SECONDS" =~ ^[0-9]+([.][0-9]+)?$ &&
          "$PRETRANSFER_SECONDS" =~ ^[0-9]+([.][0-9]+)?$ &&
          "$TTFB_SECONDS" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
        PHASE_ESTIMATES="$(awk \
            -v dns="$DNS_SECONDS" \
            -v connect="$CONNECT_SECONDS" \
            -v appconnect="$APPCONNECT_SECONDS" \
            -v pretransfer="$PRETRANSFER_SECONDS" \
            -v ttfb="$TTFB_SECONDS" \
            'BEGIN {
                tcp = connect - dns;
                wait = ttfb - pretransfer;
                if (tcp < 0) tcp = 0;
                if (wait < 0) wait = 0;
                printf "tcp_setup_seconds=%.6f\n", tcp;
                if (appconnect + 0 > 0) {
                    tls = appconnect - connect;
                    if (tls < 0) tls = 0;
                    printf "tls_handshake_seconds=%.6f\n", tls;
                }
                printf "response_wait_after_pretransfer_seconds=%.6f\n", wait;
            }')"
        printf '%s\n' "$PHASE_ESTIMATES"
    elif [[ "$REDIRECT_COUNT" =~ ^[1-9][0-9]*$ ]]; then
        printf 'phase_estimates=not_applicable_with_redirects\n'
    fi

    if [ "$CURL_EXIT" -ne 0 ]; then
        printf 'RESULT=REQUEST_FAILED\n'
        RC="$CURL_EXIT"
    elif [[ ! "$HTTP_CODE" =~ ^[0-9]{3}$ ||
            ! "$TOTAL_SECONDS" =~ ^[0-9]+([.][0-9]+)?$ ||
            ! "$TTFB_SECONDS" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
        printf 'RESULT=METRICS_INVALID\n'
        RC=2
    elif [ "$HTTP_CODE" != '200' ]; then
        printf 'RESULT=HTTP_ERROR\n'
        RC=3
    elif awk -v total="$TOTAL_SECONDS" -v ttfb="$TTFB_SECONDS" \
        'BEGIN { exit !((total + 0) >= 5 || (ttfb + 0) >= 5) }'; then
        printf 'RESULT=SLOW_RESPONSE\n'
        # One immediate follow-up probe: a fast retry indicates the slowness was a cold
        # Passenger spawn (worker is warm now); a slow retry indicates a persistently slow app.
        # Kept on one source line for the same wrapping reason as WRITE_OUT above.
        WARM_RETRY_WRITE_OUT='warm_retry_http_code=%{http_code}\nwarm_retry_ttfb_seconds=%{time_starttransfer}\nwarm_retry_total_seconds=%{time_total}\n'
        WARM_RETRY_METRICS="$(curl -q --silent --show-error --location --max-time 60 \
            --output /dev/null \
            --write-out "$WARM_RETRY_WRITE_OUT" \
            "$URL")"
        WARM_RETRY_EXIT=$?
        printf '%s\n' "$WARM_RETRY_METRICS"
        printf 'warm_retry_exit=%s\n' "$WARM_RETRY_EXIT"
        RC=0
    else
        printf 'RESULT=OK\n'
        RC=0
    fi

    printf '%s\n' '--- End ---'
    exit "$RC"
} >> "$LOG" 2>&1
