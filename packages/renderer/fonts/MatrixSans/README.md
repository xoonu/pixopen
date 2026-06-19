# Matrix Sans (Flip Note glyphs)

Flip Note uses 5×7 pixel glyphs extracted from the **Matrix Sans Regular** master bitmap included in this project.

- Upstream: [FriedOrange/MatrixSans](https://github.com/FriedOrange/MatrixSans)
- License: [SIL Open Font License 1.1](OFL.txt)

To regenerate `src/matrixSansFlipNoteFont.ts` after updating the source files:

```bash
npm run generate:font -w @pixopen/renderer
```

Source files:

- `glyphs.pbm` — master dot-matrix sprite sheet
- `glyphs.csv` — glyph name layout
