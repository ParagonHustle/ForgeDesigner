#!/bin/bash

# This script comments out the entire duplicate route

# First, find where the duplicate route definition starts
start_line=2599

# Find the matching closing brace (assuming proper indentation)
end_line=$(awk -v start=$start_line '
  NR >= start && /^  }/ {
    print NR
    exit
  }
' server/routes.ts)

# Add 1 to include the closing brace and semicolon
end_line=$((end_line + 1))

# Create a sed command to comment out all lines in the range
sed_cmd="${start_line},${end_line}s/^/\/\/ DISABLED: /"

# Apply the sed command to comment out the entire route
sed -i "$sed_cmd" server/routes.ts

echo "Completely disabled duplicate route in server/routes.ts from line $start_line to $end_line"