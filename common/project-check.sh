#!/bin/bash
set -e

if grep -nr --exclude-dir=common --exclude-dir=node_modules --exclude-dir=adapters --exclude-dir=controllers --exclude-dir=models --exclude-dir=logs --exclude-dir=tests --exclude .travis.yml service-name .;
then
    echo "Incomplete project setup"
    exit 1
fi
if grep -nr --exclude-dir=common --exclude-dir=node_modules --exclude-dir=adapters --exclude-dir=controllers --exclude-dir=models --exclude-dir=logs --exclude-dir=tests --exclude .travis.yml service_name .;
then
    echo "Incomplete project setup"
    exit 1
fi
if grep -nr --exclude-dir=common --exclude-dir=node_modules --exclude-dir=logs --exclude-dir=tests --exclude .travis.yml "code\": \"99\"" .;
then
    echo "Incomplete project setup"
    exit 1
fi
if grep -nr --exclude-dir=common --exclude-dir=node_modules --exclude-dir=logs --exclude-dir=tests --exclude .travis.yml "//\\s*[Tt][Oo][Dd][Oo]\\s*:" .;
then
    echo "ToDo contains no assignee"
    exit 1
fi
if grep -nr --exclude-dir=common --exclude-dir=node_modules --exclude-dir=logs --exclude-dir=tests --exclude .travis.yml "//\\s*[Nn][Oo][Tt][Ee]\\s*:" .;
then
    echo "Note contains no writer"
    exit 1
fi
if [ -d "./util" ];
then
    echo "No utils folder allowed"
    exit 1
fi
if [ -d "./utils" ];
then
    echo "No utils folder allowed"
    exit 1
fi
if [ -d "./utility" ];
then
    echo "No utils folder allowed"
    exit 1
fi
if [ -d "./utilities" ];
then
    echo "No utils folder allowed"
    exit 1
fi
