## Docker installation

Create a Stack in Portainer and paste the following code:

```yaml
services:
  portfolio:
    image: lolgufdhd/portfolio:latest
    container_name: portfolio
    ports:
      - "4000:3000"
    restart: unless-stopped
```

## Plan für Vite (Issue #19)

### Ziel
Vite soll geprüft und schrittweise eingeführt werden, um Frontend-Assets effizienter zu laden und die Seite bei großen 4K-Bildern stabiler und schneller zu machen.

### Pro
- Schnellere Entwicklung durch sehr schnellen Dev-Server (HMR).
- Moderne Build-Pipeline mit Asset-Hashing und Production-Bundle.
- Gute Basis für spätere Optimierungen (Code-Splitting, Lazy Loading, moderne JS/CSS-Verarbeitung).

### Contra
- Migrationsaufwand, weil aktuell ein Express/EJS-Setup ohne Build-Schritt genutzt wird.
- Zusätzliche Komplexität in Deployment und Docker (neuer Build-Schritt nötig).
- Vite allein löst große 4K-Bilder nicht vollständig; Bildgrößen/-formate müssen zusätzlich optimiert werden.

### Umsetzung (schrittweise)
1. **Ist-Analyse:** Aktuelle statische Assets (CSS/JS/Bilder) erfassen und Engpässe messen.
2. **PoC:** Vite mit kleinem Einstieg (z. B. CSS/JS-Bundling) parallel zum bestehenden Setup einführen.
3. **Integration:** Build-Output (`dist`) sauber über Express ausliefern.
4. **Bildstrategie:** 4K-Originale behalten, aber für die Timeline gezielte Vorschau-Dateien nutzen.
   - Upload speichert das Original (für Lightbox/Detailansicht) unverändert.
   - Zusätzlich je Bild 1–2 kleinere Preview-Versionen erzeugen (z. B. `-preview`, `-medium`) statt beim Scrollen das 4K-Original zu laden.
   - Timeline nutzt nur Preview-Dateien; Lightbox lädt erst beim Öffnen das Original.
5. **Validierung:** Lighthouse/PageSpeed vor/nach Migration vergleichen und Deployment anpassen.
