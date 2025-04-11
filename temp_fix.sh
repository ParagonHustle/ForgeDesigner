#!/bin/bash
sed -i '614s/value.toFixed(2)/typeof value === "number" ? value.toFixed(2) : "0.00"/g' client/src/components/forge/ForgeView.tsx
sed -i '651s/value.toFixed(2)/typeof value === "number" ? value.toFixed(2) : "0.00"/g' client/src/components/forge/ForgeView.tsx
sed -i '699s/value.toFixed(2)/typeof value === "number" ? value.toFixed(2) : "0.00"/g' client/src/components/forge/ForgeView.tsx
sed -i '832s/value.toFixed(2)/typeof value === "number" ? value.toFixed(2) : "0.00"/g' client/src/components/forge/ForgeView.tsx
chmod +x temp_fix.sh
./temp_fix.sh
rm temp_fix.sh
