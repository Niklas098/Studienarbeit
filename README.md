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

## Metriken, Score-Berechnung und Zweck

Alle Bildwerte werden intern auf 0 bis 1 normiert. Ein hoher Score bedeutet:
Der ausgeschnittene Laesionsbereich ist technisch gut genug, damit er spaeter
sinnvoll fuer ein Modell oder eine weitere Auswertung genutzt werden kann. Der
Score ist keine medizinische Bewertung der Laesion.

Der Endscore wird aus drei Teil-Scores berechnet:

```text
finalScore =
  0.05 * technicalScore
+ 0.20 * roiScore
+ 0.75 * cropScore
- capturePenalty
- cropTechnicalPenalty
```

Die Gewichte werden normalisiert, falls sie beim Funktionsaufruf ueberschrieben
werden. Standardmaessig zaehlt also der Crop am staerksten, weil am Ende genau
dieser Ausschnitt als Trainings- oder Modellinput verwendet wird. Der finale
Wert wird danach auf den Bereich 0 bis 1 begrenzt.

### 1. Original-Technik (`technicalScore`, 5 %)

Der `technicalScore` bewertet das komplette Originalbild. Er zaehlt nur mit
5 % in den Endscore, weil eine schwache Originalaufnahme nach einem guten Crop
trotzdem noch brauchbar sein kann. Gleichzeitig liefert er Warnungen und kann
bei extrem schlechter Aufnahme einen Hard-Reject ausloesen.

Berechnung:

```text
technicalScore = clamp(1 - Summe der Gewichte aller internen Original-Issues, 0, 1)
```

Die sichtbaren Issues sind fuer HAM10000-aehnliche Dermatoskopiebilder
zusaetzlich kalibriert, damit z. B. normale 600-x-450-Bilder nicht staendig als
zu niedrig aufgeloest angezeigt werden. Der interne Score bleibt dadurch stabil,
aber die ausgegebenen Issues sind weniger ueberempfindlich.

| Metrik | Zweck | Berechnung |
| --- | --- | --- |
| `meanBrightness` | Erkennen, ob das Bild insgesamt zu dunkel oder zu hell ist. | Mittelwert der Grauwerte. |
| `contrast` | Globaler Helligkeitskontrast. | Standardabweichung der Grauwerte. |
| `dynamicRange` | Prueft, ob genug Helligkeitsumfang vorhanden ist. | 95-%-Perzentil minus 5-%-Perzentil des Grauwert-Histogramms. |
| `sharpnessLaplacian` | Feine Kanten und Mikrokontrast. | Varianz eines 8-Nachbarschaft-Laplacian-Filters. |
| `sharpnessGradient` | Allgemeine Kantenschaerfe. | Durchschnittliche Sobel-Gradientenstaerke. |
| `noiseEstimate` | Rauschen in flachen Bildbereichen. | Lokale Abweichung vom 3-x-3-Mittelwert, bevorzugt in Bereichen mit niedriger Gradientenstaerke. |
| `colorCastR/G/B` | Farbstich der Aufnahme. | Abweichung des mittleren R-, G- oder B-Kanals vom mittleren RGB-Wert. |
| `saturation` | Allgemeine Farbsattigung. | Mittelwert aus `max(R,G,B) - min(R,G,B)`. |
| `centerBrightness` / `edgeBrightness` | Zentrum gegen Rand vergleichen. | Mittelwert im mittleren 50-%-Fenster gegen restliches Bild. |
| `centerContrast` / `edgeContrast` | Ob das Motiv im Zentrum genug Struktur hat. | Standardabweichung im Zentrum gegen Randbereich. |

Interne Original-Issue-Gewichte:

| Issue | Gewicht im `technicalScore` | Bedeutung |
| --- | ---: | --- |
| `too_blurry` | 0.25 | Original ist unscharf. |
| `too_low_resolution` | 0.25 | Original hat zu wenige Pixel nach allgemeinen Grenzwerten. |
| `too_dark` / `too_bright` | je 0.15 | Original ist stark unter- oder ueberbelichtet. |
| `low_contrast` | 0.15 | Zu wenig Kontrast oder Dynamikbereich. |
| `high_noise` | 0.10 | Starkes Rauschen. |
| `uneven_lighting` | 0.10 | Zentrum und Rand sind stark unterschiedlich hell. |
| `strong_color_cast` | 0.10 | Deutlicher Farbstich. |
| `possible_shadow_issue` | 0.05 | Schatten/Vignettierung moeglich. |
| `subject_too_small` | 0.05 | Zentrum hat deutlich weniger Kontrast als der Rand. |
| `center_underexposed` / `center_overexposed` | je 0.05 | Zentrum ist zu dunkel oder zu hell. |

### 2. ROI-/Laesionsqualitaet (`roiScore`, 20 %)

Der `roiScore` bewertet, ob die markierte oder automatisch gefundene Laesion als
Laesionsbereich plausibel ist. Bei manueller Korrektur wird dieselbe Logik erneut
auf die korrigierte ROI angewendet.

Die automatische ROI wird ueber Farbabstand im Lab-Farbraum gesucht: Aus dem
Bildrand wird ein Haut-/Hintergrundwert geschaetzt, danach wird die auffaellige
Komponente per Otsu-Schwelle oder K-Means-Fallback ausgewaehlt. Bei manueller ROI
wird direkt die gesetzte Bounding Box oder Polygonmaske genutzt.

Berechnung:

```text
roiScore = clamp(1 - Summe der Gewichte aller Laesions-Issues, 0, 1)
```

| Metrik | Zweck | Berechnung |
| --- | --- | --- |
| `lesionAreaRatio` | Prueft, ob die Laesion im Bild plausibel gross ist. | Maskenpixel der Laesion geteilt durch alle Bildpixel. |
| `bbox` | Lage und Groesse der Laesion. | Normalisierte Bounding Box `[x, y, w, h]` aus der Maske. |
| `centroid` / `lesionCenterDistance` | Prueft, ob die Laesion stark am Rand liegt. | Abstand des Maskenschwerpunkts zur Bildmitte. |
| `lesionBorderTouchRatio` | Erkennt abgeschnittene Laesionen. | Anteil der Maskenpixel, die den Bildrand beruehren. |
| `lesionContrastDeltaE` | Hautlaesionsspezifischer Farbkontrast. | DeltaE zwischen mittlerem Lab-Wert der Laesion und einem Ring direkt um die Laesion. |
| `lesionEdgeSharpness` | Schaerfe des Laesionsrandes. | Durchschnittlicher Grauwert-Gradient entlang der Maskengrenze. |
| `lesionHairScore` | Stoerende Haare ueber der Laesion. | Anteil dunkler, linienartiger Black-Hat-Strukturen innerhalb der Maske. |
| `lesionSpecularScore` | Stoerende Glanzstellen. | Anteil sehr heller, wenig gesaettigter Pixel innerhalb der Maske. |
| `lesionVisibilityScore` | Zusammenfassung, ob die Laesion sichtbar genug ist. | `0.35 * areaNorm + 0.35 * contrastNorm + 0.30 * edgeNorm`; Zielgroesse ca. 12 % Bildflaeche, Kontrast normiert auf DeltaE 12, Rand auf 0.05. |
| `lesionConfidence` | Sicherheit der Auto-ROI. | `0.30 * areaScore + 0.30 * contrastScore + 0.20 * edgeScore + 0.20 * centerScore`. |

Laesions-Issue-Gewichte:

| Issue | Gewicht im `roiScore` | Bedeutung |
| --- | ---: | --- |
| `lesion_not_found` | 0.50 | Keine verwertbare Laesion gefunden. |
| `lesion_cutoff` | 0.25 | Laesion ist am Rand abgeschnitten. |
| `needs_manual_roi` | 0.15 | Auto-ROI ist unsicher und sollte korrigiert werden. |
| `lesion_too_small` | 0.15 | Laesion ist im Original zu klein. |
| `lesion_low_contrast` | 0.12 | Laesion hebt sich farblich zu wenig ab. |
| `lesion_edge_blur` | 0.12 | Laesionsrand ist unscharf. |
| `lesion_too_large` | 0.10 | Laesion belegt unrealistisch viel Bildflaeche. |
| `hair_occlusion` | 0.08 | Haare verdecken die Laesion. |
| `specular_highlights` | 0.06 | Glanzstellen stoeren die Laesion. |
| `lesion_off_center` | 0.04 | Laesion liegt deutlich randnah. |

### 3. Crop-Qualitaet (`cropScore`, 75 %)

Der `cropScore` ist der wichtigste Teil. Er bewertet den tatsaechlichen
Laesionsausschnitt, der am Ende exportiert oder an ein Modell gegeben wird.

Der Crop wird aus der ROI erzeugt und automatisch mit Toleranz erweitert:

```text
Padding je Richtung = max(0.03 des Gesamtbildes, 0.16 * ROI-Breite/Hoehe)
```

Dadurch bleibt normalerweise ein kleiner Hautrand um die Laesion erhalten. Wenn
die ROI am Bildrand liegt, kann dieser Rand aber nicht beliebig rekonstruiert
werden.

| Metrik | Zweck | Berechnung |
| --- | --- | --- |
| `cropMinEdgePx` | Reale Pixelgroesse des Ausschnitts. | Kleinere Kante des Crops in Pixeln. |
| `lesionMinEdgePx` | Reale Pixelgroesse der Laesion. | Kleinere Kante der markierten Laesionsbox in Pixeln. |
| `cropEdgeScore` | Ob der Crop selbst genug Pixel hat. | `clamp(cropMinEdgePx / minCropEdgePx, 0, 1) ^ 1.15`; Standard `minCropEdgePx = 224`. |
| `lesionPixelScore` | Ob die Laesion genug Pixel hat. | `clamp(lesionMinEdgePx / minLesionEdgePx, 0, 1) ^ 1.20`; Standard `minLesionEdgePx = 96`. |
| `resolutionScore` | Zusammenfassung der Pixel-Eignung. | `0.35 * cropEdgeScore + 0.65 * lesionPixelScore`; Laesionspixel zaehlen staerker. |
| `minMarginRatio` | Kleinster Hautrand um die Laesion. | Minimaler Abstand ROI zu Crop-Rand, relativ zur Cropgroesse. |
| `marginScore` | Ob genug Rand erhalten ist. | `clamp(minMarginRatio / minCropMarginRatio, 0, 1)`; Standard `minCropMarginRatio = 0.045`. |
| `lesionFillRatio` | Wie stark die Laesion den Crop fuellt. | Laesions-Bounding-Box-Flaeche geteilt durch Crop-Flaeche. |
| `fillScore` | Ob der Crop weder zu eng noch zu locker ist. | `clamp(1 - abs(lesionFillRatio - 0.52) / 0.36, 0, 1)`. |
| `brightnessScore` | Crop nicht zu dunkel/hell. | Score um Zielhelligkeit 0.5 mit Toleranz 0.28. |
| `dynamicRangeScore` | Genug Helligkeitsumfang im Crop. | `clamp(dynamicRange / 0.42, 0, 1)`. |
| `cropContrastScore` | Genug lokaler/globaler Crop-Kontrast. | `clamp(contrast / 0.14, 0, 1)`. |
| `sharpnessScore` | Crop-Schaerfe. | `clamp(0.65 * sharpnessGradient / 0.13 + 0.35 * sharpnessLaplacian / 0.0016, 0, 1)`. |
| `noiseScore` | Crop rauscht nicht zu stark. | `clamp(1 - max(0, noiseEstimate - 0.015) / 0.045, 0, 1)`. |
| `lightingScore` | Hintergrund im Crop ist gleichmaessig beleuchtet. | Aus vier Hintergrundquadranten ausserhalb der ROI: `clamp(1 - (maxHelligkeit - minHelligkeit) / 0.22, 0, 1)`. |
| `colorScore` | Kein starker Farbstich im Crop. | `clamp(1 - max(0, colorCastMagnitude - 0.05) / 0.12, 0, 1)`. |
| `cropTechnicalScore` | Technische Crop-Bildqualitaet ohne Laesionssemantik. | `0.18 * brightnessScore + 0.20 * dynamicRangeScore + 0.14 * cropContrastScore + 0.22 * sharpnessScore + 0.13 * noiseScore + 0.09 * lightingScore + 0.04 * colorScore`. |
| `lesionContrastScore` | Laesion hebt sich im Crop farblich ab. | `clamp(lesionContrastDeltaE / 16, 0, 1)`. |
| `lesionEdgeScore` | Laesionsrand im Crop ist scharf genug. | `clamp(lesionEdgeSharpness / 0.075, 0, 1)`. |
| `visibilityScore` | Laesion ist im Crop insgesamt gut sichtbar. | `0.30 * fillScore + 0.30 * lesionContrastScore + 0.30 * lesionEdgeScore + 0.10 * marginScore`. |
| `artifactScore` | Haare/Glanzstellen stoeren nicht zu stark. | `clamp(1 - 0.60 * hairPenalty - 0.40 * specularPenalty, 0, 1)`, mit `hairPenalty = lesionHairScore / 0.10` und `specularPenalty = lesionSpecularScore / 0.055`. |
| `cropAreaRatio` | Wie viel vom Originalbild ausgeschnitten wird. | Crop-Flaeche geteilt durch Originalflaeche. |
| `touchesImageBorder` | Ob der Crop am Originalrand liegt. | Wahr, wenn die Crop-Box eine Bildkante beruehrt. |

Berechnung des `cropScore`:

```text
cropScore =
  clamp(
    (
      0.20 * cropTechnicalScore
    + 0.19 * resolutionScore
    + 0.10 * marginScore
    + 0.08 * fillScore
    + 0.14 * lesionContrastScore
    + 0.15 * lesionEdgeScore
    + 0.08 * artifactScore
    + 0.05 * visibilityScore
    )
    * (0.88 + 0.12 * resolutionScore),
    0,
    1
  )
```

Der letzte Faktor sorgt dafuer, dass sehr kleine Crops oder Laesionen trotz
sonst guter Werte etwas vorsichtiger bewertet werden. Dadurch faellt ein Bild
nicht automatisch nur wegen weniger Pixel durch, aber der Score wird realistischer
gedrueckt.

### Penalties, Issues und Hard-Rejects

Issues sind Erklaerungen und Warnsignale. Sie zaehlen nicht alle direkt in den
Endscore. Der Endscore wird hauptsaechlich ueber die drei Teil-Scores berechnet.
Zwei kleine Penalties koennen ihn danach senken:

| Penalty | Berechnung | Zweck |
| --- | --- | --- |
| `capturePenalty` | Wichtige Aufnahme-Issues ziehen je 0.025 ab, `strong_color_cast` nur 0.010; maximal 0.060. | Schlechte Originalaufnahme leicht beruecksichtigen, ohne den Crop-Score zu zerstoeren. |
| `cropTechnicalPenalty` | Zieht 0.030 ab, wenn `cropTechnicalScore < 0.62`. | Crop technisch sichtbar schwach, auch wenn einzelne Laesionsmetriken gut sind. |

Hard-Rejects entscheiden ueber den Status, deckeln aber den numerischen Score
nicht. So bleibt in der Statistik sichtbar, ob ein Reject knapp oder extrem
schlecht war.

| Hard-Reject | Wann er ausgeloest wird |
| --- | --- |
| `hard_no_roi` | Keine ROI/Laesion vorhanden. |
| `hard_crop_missing` | Es konnte kein Crop erzeugt werden. |
| `hard_roi_reject` | ROI-Analyse ist Reject und enthaelt kritische ROI-Probleme wie `lesion_not_found` oder `lesion_cutoff`. |
| `hard_crop_unusable` | Crop-Status ist Reject und `cropScore < 0.58`. |
| `hard_original_unusable` | Original-`generalScore < 0.15`, also extrem schlechte Aufnahme. |

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
