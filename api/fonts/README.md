# PDF Brand Fonts

Embedded by `api/pdf_generator.py` (registration is filename-exact — do not rename):

| File | Face | Used for |
|---|---|---|
| `IBMPlexSans-Regular.ttf` | IBM Plex Sans 400 | body / prose |
| `IBMPlexSans-Bold.ttf` | IBM Plex Sans 700 | hero, headings |
| `DMMono-Regular.ttf` | DM Mono 400 | data, labels, footer |
| `DMMono-Medium.ttf` | DM Mono 500 | emphasized data ("bold" mono) |

Source: Google Fonts (gstatic), downloaded 12 Jun 2026. Both families are
licensed under the SIL Open Font License 1.1 — redistribution in this repo
and inside the Docker image is permitted.

Missing files are non-fatal: the generator falls back to Helvetica/Courier
(off-brand but readable). These fonts ship in the image via the root
`COPY . .` in `ops/deploy/Dockerfile` — keep them out of `.dockerignore`.
