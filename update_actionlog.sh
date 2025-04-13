#!/bin/bash
# This script finds all remaining instances of setActionLog and updates them to add items at the beginning

file="client/src/components/battles/BattleLog.tsx"

# Replace pattern 1: [...prev, actionMessage]
sed -i 's/setActionLog(prev => \[\.\.\.\prev, /setActionLog(prev => \[/g' $file
sed -i 's/setActionLog(prev => \[message, /setActionLog(prev => \[message, /g' $file
sed -i 's/setActionLog(prev => \[\`/setActionLog(prev => \[\`/g' $file

# Change lines that have a closing bracket at the end (not already modified)
# This avoids touching lines we've already modified that end with ...prev])
grep -n "setActionLog(prev => \[.*\]);" $file | grep -v "message, " | grep -v "${.*}, " | while read -r line; do
  line_number=$(echo $line | cut -d':' -f1)
  content=$(echo $line | cut -d':' -f2-)
  
  # Check if it's already in the new format (item at beginning)
  if ! echo "$content" | grep -q "setActionLog(prev => \[[^\.]*,"; then
    # Extract what's inside [...prev, X])
    inner=$(echo "$content" | sed -E 's/.*\[\.\.\.(prev|actionLog), ([^]]*)\]\).*/\2/')
    
    # Create replacement with item at beginning
    replacement="setActionLog(prev => [$inner, ...prev]);"
    
    # Replace the line
    sed -i "${line_number}s/.*/$replacement/" $file
  fi
done

# Fix special cases with array inside (like Stage completed)
grep -n "setActionLog(prev => \[" $file | grep -A2 "\.\.\." | while read -r line; do
  line_number=$(echo $line | cut -d':' -f1)
  
  # Check if this is a multi-line array construction
  next_line=$(sed -n "$((line_number+1))p" $file)
  
  if [[ "$next_line" =~ "...prev," ]]; then
    # This is the first line of a multi-line array construction
    
    # Extract content from the next line after ...prev,
    content=$(echo "$next_line" | sed -E 's/.*\.\.\.prev, (.*)/\1/')
    
    # Replace first line
    sed -i "${line_number}s/setActionLog(prev => \[/setActionLog(prev => \[/" $file
    
    # Replace second line
    sed -i "$((line_number+1))s/\s*\.\.\.prev, /$content, ...prev,/" $file
  fi
done

# Find any remaining cases
echo "Potential remaining cases to check manually:"
grep -n "setActionLog" $file | grep "prev" | grep -v "message, ...prev" | grep -v ", ...prev"
