#!/bin/sh

version=$(jq -r .version carrot/manifest.json)
zipname=carrot-v$version.zip

printf "Packing release/$zipname..."

mkdir -p release
rm -f release/$zipname

cd carrot
cp manifest.json manifest_orig.json
jq 'del(.browser_specific_settings)' manifest_orig.json > manifest.json
zip -q -r ../release/$zipname . -x manifest_orig.json
mv manifest_orig.json manifest.json

printf " Done!\n"
