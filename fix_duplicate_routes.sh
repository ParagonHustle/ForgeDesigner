#!/bin/bash

# This script finds the duplicate route and adds a comment to disable it
# Using sed to add a comment to the line that defines the first (duplicate) route

sed -i '2599s/app.post/\/\/ DISABLED - duplicate route\n  \/\/ app.post/' server/routes.ts

echo "Fixed duplicate routes issue in server/routes.ts"