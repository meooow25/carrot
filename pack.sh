#!/bin/sh

jq_manifest_replace() {
  local jq_command="$1"
  local manifest_file="$2"
  local manifest_file_tmp="${manifest_file}.tmp"
  jq "${jq_command}" "${manifest_file}" > "${manifest_file_tmp}"
  mv "${manifest_file_tmp}" "${manifest_file}"
}

pack_firefox() {
  local firefox_zip="$1"
  local release_dir="$2"
  local tmp_dir="$3"

  mkdir -p "${release_dir}"
  printf "Packing ${release_dir}/${firefox_zip}..."

  mkdir -p "${tmp_dir}"
  cp -r carrot "${tmp_dir}"
  cd "${tmp_dir}/carrot"

  # Remove browser_specific_settings from manifest.
  jq_manifest_replace 'del(.browser_specific_settings)' manifest.json

  # Prepare the zip.
  rm -f "../../${release_dir}/${firefox_zip}"
  zip -q -r "../../${release_dir}/${firefox_zip}" .

  # Clean up.
  cd ../..
  rm -r "${tmp_dir}/carrot"

  printf " Done!\n"
}

pack_chrome() {
  local chrome_zip="$1"
  local release_dir="$2"
  local tmp_dir="$3"

  mkdir -p "${release_dir}"
  printf "Packing ${release_dir}/${chrome_zip}..."

  mkdir -p "${tmp_dir}"
  cp -r carrot "${tmp_dir}"
  cd "${tmp_dir}"

  # Download the polyfill.
  local polyfill_url='https://unpkg.com/webextension-polyfill@0.6.0/dist/browser-polyfill.min.js'
  local polyfill_download_path='downloads/browser-polyfill.min.js'
  local polyfill_path='polyfill/browser-polyfill.min.js'
  mkdir -p downloads
  if [ ! -f "${polyfill_download_path}" ]; then
    curl -s -o "${polyfill_download_path}" "${polyfill_url}"
    sed -i '/sourceMappingURL/ d' "${polyfill_download_path}"
  fi
  mkdir -p "carrot/$(dirname "${polyfill_path}")"
  cp "${polyfill_download_path}" "carrot/${polyfill_path}"

  cd carrot

  # Insert the polyfill before the first script tag in every html file.
  local polyfill_script="<script src=\"\/${polyfill_path/\//\\\/}\"><\/script>"
  shopt -s globstar
  for html_file in **/*.html; do
    sed -i -r "0,/<script/ s/((\s+)<script)/\2${polyfill_script}\n\1/" "${html_file}"
  done

  # Add the polyfill as content script.
  jq_manifest_replace ".content_scripts[].js |= [\"${polyfill_path}\"] + ." manifest.json

  # Prepare png icons from svg.
  icon_sizes=(16 32 48 128)
  icons_json=''
  for size in ${icon_sizes[@]}; do
    rsvg-convert -w "${size}" -h "${size}" -o "icons/icon${size}.png" icons/icon.svg
    icons_json="${icons_json},\"${size}\":\"icons/icon${size}.png\""
  done
  rm icons/icon.svg
  icons_json="{${icons_json:1}}"

  # Set png icons in the manifest.
  jq_manifest_replace ".icons = ${icons_json} |
      .browser_action.default_icon = \"icons/icon${icon_sizes[-1]}.png\"" manifest.json

  # Final touches to manifest.json.
  jq_manifest_replace 'del(.browser_specific_settings) |
      if .options_ui.browser_style
        then .options_ui.chrome_style = .options_ui.browser_style else . end |
      del (.options_ui.browser_style) |
      del (.browser_action.browser_style)' manifest.json

  # Prepare the zip.
  rm -f "../../${release_dir}/${chrome_zip}"
  zip -q -r "../../${release_dir}/${chrome_zip}" .

  # Clean up.
  cd ../..
  rm -r "${tmp_dir}/carrot"

  printf " Done!\n"
}

set -e

version=$(jq -r .version carrot/manifest.json)
firefox_zip="carrot-firefox-v${version}.zip"
chrome_zip="carrot-chrome-v${version}.zip"

pack_firefox "${firefox_zip}" release tmp
pack_chrome "${chrome_zip}" release tmp
