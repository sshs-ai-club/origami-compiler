#!/usr/bin/env bash
# Download the papers listed in MANIFEST.tsv into papers/pdf/.
#
#   ./papers/fetch.sh            # everything
#   ./papers/fetch.sh 1          # priority 1 only (start here: 5 papers)
#   ./papers/fetch.sh 1 2        # priorities 1 and 2
#
# Skips files already downloaded. Safe to re-run.
set -uo pipefail
cd "$(dirname "$0")"
mkdir -p pdf
WANT="${*:-1 2 3 4}"
ok=0; skip=0; fail=0

while IFS=$'\t' read -r key prio source id title why; do
  [[ "$key" == \#* || -z "${key:-}" ]] && continue
  [[ " $WANT " == *" $prio "* ]] || continue
  out="pdf/${key}.pdf"
  if [[ -s "$out" ]]; then echo "  skip  $key"; ((skip++)); continue; fi

  case "$source" in
    arxiv)   url="https://arxiv.org/pdf/${id}" ;;
    demaine) url="https://erikdemaine.org/papers/${id}/paper.pdf" ;;
    url)     url="$id" ;;
    *)       echo "  ??    $key: unknown source '$source'"; ((fail++)); continue ;;
  esac

  printf "  get   %-24s " "$key"
  if curl -fsSL --retry 3 --retry-delay 2 -m 120 -o "$out" "$url" \
     && [[ -s "$out" ]] && head -c 5 "$out" | grep -q '%PDF'; then
    echo "ok  ($(du -h "$out" | cut -f1))"; ((ok++))
  else
    rm -f "$out"; echo "FAILED  <- $url"; ((fail++))
  fi
  sleep 1   # be polite to arxiv
done < MANIFEST.tsv

echo
echo "downloaded $ok, skipped $skip, failed $fail"
[[ $fail -gt 0 ]] && echo "For failures, open the URL in a browser and save to papers/pdf/<key>.pdf"
exit 0
