# REBEL BAKER · Bakery Studio V2 Preview R5

R5 hardens recipe costing validation on top of the R4 Ingredient Library and conversion metadata.

## R5 updates
- A recipe cannot be saved without at least one completed ingredient row.
- Ingredient rows with partial, missing, non-numeric, zero, or negative quantities are flagged before saving. Purchase price may be zero, but cannot be negative.
- Cross-dimension conversions that lack the required Density or ingredient-specific spoon weight remain blocked rather than guessed.
- Yield must be a positive number. Zero, blank, negative, or invalid yield is flagged instead of silently being changed to one.
- Extra-cost rows are validated; incomplete rows and negative costs are blocked. Blank extra rows remain optional.
- Saved recipe data excludes unused blank ingredient and extra rows.
- Backup export filename updated to R5. R4 JSON backups remain structurally compatible with the import flow.

## Conversion rules
- Exact conversions within the same dimension are supported (e.g. g/kg, ml/L, tsp/tbsp/cup, pcs/dozen).
- Mass-to-volume or volume-to-mass conversion requires an ingredient-specific Density in g/ml.
- Spoon-to-mass conversion prefers an ingredient-specific g/tsp value. Density can also convert a volume measure to mass when that density is appropriate for the ingredient and measuring method. One ingredient's spoon weight is never reused for another.
- Calculations retain full precision internally and round only for display.

## Important limitations
- This remains a local prototype. Data stays in this browser's localStorage; export backups regularly.
- R5 is separate from V1 and does not migrate or overwrite V1 data.
- Existing saved recipes retain their ingredient-cost snapshots. Editing an Ingredient Library item does not silently rewrite historical recipe costs; reselect/update the ingredient in a recipe when you intentionally want the new purchase data applied.
- No cloud sync, AI connection, ingredient price history, recipe version control, audit trail, nutrition database, or production scheduling yet.
- User-entered source and reliability labels are recordkeeping metadata, not external certification.

## Verification performed
- JavaScript syntax check passed.
- Automated validation checks passed for: no ingredients, a valid mass-based ingredient, negative purchase price, zero yield, missing Density for mass/volume conversion, ingredient-specific spoon conversion, negative extra cost, and per-piece extra cost.

## Run
Open `index.html` in a modern browser or publish the folder to a static host.
