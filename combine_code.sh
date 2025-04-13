
#!/bin/bash

# Create output file
output_file="all_code.txt"
echo "Combined Code Files - $(date)" > "$output_file"

# Function to process files
process_files() {
  local dir="$1"
  
  # Find all code files
  find "$dir" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" -o -name "*.html" \) | while read -r file; do
    # Add file header
    echo -e "\n\n=== $file ===" >> "$output_file"
    # Add file contents
    cat "$file" >> "$output_file"
  done
}

# Process client and server directories
process_files "client"
process_files "server"
process_files "shared"

echo "Code has been combined into $output_file"
