#!/usr/bin/env bash
# Makes the Android upload keystore for Play (#67) and prints the GitHub
# Secrets the "Release Android" workflow needs. Run once, keep the file and
# the password somewhere safe: Play ties the app to this key (with Play App
# Signing the key can be reset through support, but it takes days).
#
#   scripts/android-keystore.sh [output-dir]
#
# Uses keytool when a JDK is installed, otherwise openssl (a PKCS12 store,
# which Gradle accepts the same way).
set -euo pipefail
# Git Bash on Windows would turn the -subj value into a path.
export MSYS_NO_PATHCONV=1

out="${1:-$HOME/planera-keys}"
mkdir -p "$out"
store="$out/planera-upload.p12"
alias="planera"
if [ -f "$store" ]; then
  echo "Keystore already exists: $store" >&2
  exit 1
fi

password="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
dname="CN=Planera, O=Planera, L=Baku, C=AZ"

if command -v keytool >/dev/null 2>&1; then
  keytool -genkeypair -v -storetype PKCS12 -keystore "$store" -alias "$alias" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$password" -keypass "$password" -dname "$dname"
else
  key="$out/planera-upload.key"
  crt="$out/planera-upload.crt"
  openssl req -x509 -newkey rsa:2048 -nodes -days 10000 -subj "/CN=Planera/O=Planera/L=Baku/C=AZ" \
    -keyout "$key" -out "$crt" 2>/dev/null
  openssl pkcs12 -export -inkey "$key" -in "$crt" -name "$alias" -out "$store" -passout "pass:$password"
  rm -f "$key" "$crt"
fi

printf '%s' "$password" > "$out/planera-upload.password"
chmod 600 "$store" "$out/planera-upload.password"

cat <<EOF

Keystore: $store
Alias:    $alias
Password: saved in $out/planera-upload.password

Add the GitHub Secrets (repository -> Settings -> Secrets and variables -> Actions),
or run these from a terminal that has the gh CLI signed in:

  gh secret set ANDROID_KEYSTORE_BASE64 < <(base64 -w0 "$store")
  gh secret set ANDROID_KEYSTORE_PASSWORD < "$out/planera-upload.password"
  gh secret set ANDROID_KEY_PASSWORD < "$out/planera-upload.password"
  gh secret set ANDROID_KEY_ALIAS --body "$alias"

Then: Actions -> Release Android -> Run workflow. The first upload to Play is
done by hand (Play Console -> Create app -> upload the .aab from the artifact);
after that the workflow can upload to the internal track when
PLAY_SERVICE_ACCOUNT_JSON is set (see docs/store/README.md).
EOF
