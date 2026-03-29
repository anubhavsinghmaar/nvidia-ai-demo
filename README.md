# NVIDIA AI Platform

A browser-based AI platform for exploring NVIDIA-hosted models across image generation, multi-model code generation, chart detection, and 3D asset generation.

## Live Demo

Deployed on Netlify — no backend required. All API calls are made directly from your browser.

## Features

### Section 1 — Image Generation (FLUX.2 Klein 4B)
- Text-to-image generation using Black Forest Labs' fastest model
- Supports all official resolutions (672×1568 to 1568×672)
- Configurable steps and seed
- One-click image download

### Section 2 — Code Generation (Multi-Model)
Fires all 6 models simultaneously for parallel comparison:

| Model | Provider | Parameters |
|-------|----------|------------|
| Mistral Small 4 | MistralAI | 119B |
| MiniMax M2.5 | MiniMaxAI | 230B |
| Qwen 3.5 | Alibaba | 397B MoE |
| GLM-5 | Z.ai | 744B MoE |
| Kimi K2.5 | MoonshotAI | 1T MoE |
| DeepSeek V3.2 | DeepSeek | 685B |

- Streaming output for all 6 models in real time
- Copy or download each model's response individually

### Section 3 — Chart Detection (CACHED)
- Upload a chart image to detect elements via OCR
- Detects: chart titles, axis labels, legend labels, value labels, and more
- Download results as JSON

### Section 4 — 3D Generation (TRELLIS)
- Generate GLB 3D assets from reference images
- Interactive in-browser 3D viewer (pan, zoom, rotate)
- Download the GLB file

## API Key Security

**Your API key is never stored in code or on any server.**

- You enter your key via the in-app config modal
- It is stored only in your browser's `sessionStorage` (cleared on tab close)
- API calls go directly from your browser to NVIDIA's API — Netlify never sees your key
- No `.env` files, no server-side variables, no key exposure

Get your free NVIDIA API key at [build.nvidia.com](https://build.nvidia.com).

## Deployment

### Local
Just open `index.html` in a browser — no build step needed.

### Netlify
1. Push this repo to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → Add new site → Import from Git
3. Select the repo — no build settings needed
4. Deploy

## File Structure

```
├── index.html    # App structure and layout
├── style.css     # Dark theme styling
├── app.js        # All API logic and interactivity
└── README.md
```

## Models & API Endpoints

| Section | Model | Endpoint |
|---------|-------|----------|
| 1 | FLUX.2 Klein 4B | `ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b` |
| 2 | All coding models | `integrate.api.nvidia.com/v1/chat/completions` |
| 3 | CACHED | `ai.api.nvidia.com/v1/cv/university-at-buffalo/cached` |
| 4 | TRELLIS | `ai.api.nvidia.com/v1/genai/microsoft/trellis` |

## Notes

- CACHED image input must be under ~135KB (180KB base64 limit)
- TRELLIS generation can take 30–60 seconds
- If you encounter CORS errors, a Netlify Functions proxy can be added
