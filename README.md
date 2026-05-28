# Giscard AI — Advanced Multimodal Intelligence

**Live Demo:** [giscard-ai.netlify.app](https://giscard-ai.netlify.app/)

A high-performance, feature-rich AI chatbot built with **React**, **Vite**, **Google Gemini**, and **Mistral AI**. Optimized for speed, versatility, API quota efficiency, and a premium user experience.

## Key Features

- **Multi-Model Intelligence**: Switch between Mistral Small, Pixtral 12B, Gemini 2.0 Flash, and Gemini 1.5 Pro.
- **Multi-Document Analysis**: Upload PDF, DOCX, CSV, TXT, or Image files simultaneously.
- **Quota Guardian (Smart Extraction)**: Extracts text from PDFs/DOCX within your browser — saves up to 90% on API limits.
- **AI Image Generation & Code Decoding**: Syntax-highlighted code blocks and vector SVG generation in chat.
- **Progress Visibility**: Dynamic parsing overlay and simulated upload queue for large contexts.
- **Multilingual & Maths**: Translation, math solving, and logical assistance.
- **Export History**: Download your full chat session as a formatted text file.
- **Theme Aware**: Dark and Light modes with a glass-morphism UI.

## Quick Start

### Deploy on Netlify (Recommended)
1. Fork this repository and connect it to [Netlify](https://app.netlify.com).
2. Configure Build Settings:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
3. Add **Environment Variables** (never expose these in code):
   - `VITE_GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/)
   - `VITE_MISTRAL_API_KEY` — from [La Plateforme](https://console.mistral.ai/)

> **Security:** Never commit API keys to your repository. Always use environment variables or a secrets manager.

### Local Setup
```bash
npm install
npm run dev      # development
npm run build    # production build
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS 4 |
| Icons | Lucide React |
| Animations | Framer Motion |
| AI | `@google/genai`, `@mistralai/mistralai` |
| Parsing | `pdfjs-dist`, `mammoth` |
| Rendering | React-Markdown with GFM |

## License
SPDX-License-Identifier: Apache-2.0
