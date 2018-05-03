#!/bin/bash
cd `dirname $0`
rm quantum-coffee.zip
zip -r quantum-coffee.zip ./ -x \*.DS_Store -x \*.git\* -x package.sh
