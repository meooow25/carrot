#!/bin/sh

version=$(jq -r .version carrot/manifest.json)
zipname=carrot-v$version.zip

printf "Packing release/$zipname..."

mv carrot/manifest.json carrot/manifest_orig.json
jq 'del(.browser_specific_settings)' carrot/manifest_orig.json > carrot/manifest.json
mkdir -p release
rm -f release/$zipname
(cd carrot && zip -q -r ../release/$zipname . -x manifest_orig.json)
mv carrot/manifest_orig.json carrot/manifest.json

printf " Done!\n"
