# Studienarbeit

Offline-Pipeline fuer technische Qualitaetsbewertung von Hautlaesionsbildern.

## Kern in `src`

Die portable Hauptfunktion ist `processLesionImage` aus `src/lesionPipeline.js`.
Sie erwartet ein ImageData-aehnliches Objekt:

```js
import { processLesionImage } from './src/lesionPipeline.js';

const result = processLesionImage(imageData, {
  id: 'bild_001',
  // optional nach manueller Korrektur:
  // roi: { type: 'bbox', bbox: [x, y, w, h] },
});

console.log(result.metadata.score);
console.log(result.metadata.status); // ok | warning | reject
console.log(result.metadata.reasons);
console.log(result.croppedImage);
```

Wichtige Exporte:

- `createRoiCorrectionState(imageData)`: Auto-ROI und toleranten Crop-Rand berechnen, bevor der Nutzer korrigiert.
- `processLesionImage(imageData, { roi })`: Endscore, Begruendung, Warnungen und Laesions-Crop erzeugen.
- `processLesionDataset(items)`: mehrere ImageData-Objekte durch die Pipeline laufen lassen.
- `summarizeLesionDataset(results)`: Durchschnitt, Statuszahlen, Score-Bereiche und Issue-Haeufigkeiten berechnen.
- `serializeLesionResult(result)`: JSON-sichere Metadaten ohne rohe Pixelbuffer.

Der Endscore gewichtet den Crop bewusst am staerksten:

- 75 % Crop-Qualitaet
- 20 % ROI-/Laesionsqualitaet
- 5 % allgemeine technische Bildqualitaet

Die Crop-Qualitaet bewertet Helligkeit, Dynamikbereich, lokalen Kontrast,
Schaerfe, Rauschen, Beleuchtung, Farbstich, Laesionskontrast, Rand-Schaerfe,
Randabstand, Fuellgrad sowie Haare/Glanzstellen.

Die allgemeine technische Originalbildqualitaet geht nur klein in den Score ein
und bleibt zusaetzlich als Warnsignal erhalten, wenn wichtige Aufnahmeprobleme auftreten.

Status-Schwellen:

- Score < 0.60: `reject`
- Score 0.60 bis < 0.75: `warning`
- Score >= 0.75: `ok`

Harte Ausschlussgruende werden als `hardRejects` ausgegeben und erzwingen nur
den Status `reject`. Sie deckeln den Score nicht mehr auf feste Werte wie 0.49,
damit die Datensatzstatistik weiterhin echte Score-Unterschiede zeigt.

Die Pipeline bewertet nur technische Bildqualitaet, keine medizinische Diagnose.

## Testversion im Browser

```bash
npm start
```

Dann `http://127.0.0.1:4173/test/viewer.html` oeffnen.

Die Seite kann:

- Einzelbild laden und Auto-ROI anzeigen.
- ROI per Maus korrigieren.
- Vorher/Nachher mit Score anzeigen.
- Viele Bilder oder einen Ordner als Datensatz verarbeiten.
- Datensatz-Crops direkt in der jeweiligen Bildkarte nachkorrigieren.
- Nach Status filtern und nach Score oder Metriken sortieren.
- Bestandene Crops plus `metadata.json`, `metadata.csv` und `summary.json` als ZIP exportieren.

## Datensatz zusammenfassen

Der Browser-Export kann mit Python erneut zusammengefasst werden:

```bash
python3 test/summarize_dataset.py lesion_dataset_accepted_crops.zip
python3 test/summarize_dataset.py metadata.json --out summary.json
python3 test/summarize_dataset.py metadata.csv
```

Das Skript berechnet unter anderem Durchschnitt, Anzahl OK/Warnung/Reject, 5-95-Prozent-Bereich, Score-Bands und Issue-Haeufigkeiten.

## Smoke-Test

```bash
npm test
```
