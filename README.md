# 🤖 Giscard Ai - Advanced Multimodal Intelligence

A high-performance, feature-rich AI chatbot built with **React**, **Vite**, **Google Gemini**, and **Mistral AI**. Optimized for speed, versatility, API quota efficiency, and a premium user experience.

![Giscard Ai Banner](https://picsum.photos/seed/giscard-ai/1200/400)

## 🌟 Key Features

- **🧠 Multi-Model Intelligence**: Seamlessly switch between cutting-edge models like `Mistral Small`, `Pixtral 12B`, `Gemini 2.0 Flash`, and `Gemini 1.5 Pro` to suit your exact needs (speed, logic, or vision).
- **📂 Multi-Document Analysis**: Select multiple **PDF**, **Docx**, **CSV**, **TXT**, or **Image** files simultaneously.
- **🛡️ Quota Guardian (Smart Extraction)**: Extracts text from PDFs and DOCX files securely *within your browser* before routing it to the AI. This saves up to 90% on API limits compared to uploading heavy base64 files.
- **🎨 AI Image Generation & Code Decoding**: Top-tier syntax highlighting for clean copyable code blocks only, plus vector SVG generations right in your chat.
- **⏱️ Progress Visibility**: Features a dynamic parsing overlay and an "Uploading to AI" simulated queue to track large context operations.
- **🌍 Multilingual & Maths**: Seamless translation, math solving, and logical assistance.
- **📥 Export History**: Download your entire chat session as a formatted, human-readable text file.
- **🌓 Theme Aware**: Beautiful Dark and Light modes structured with a premium glass-morphism UI.

## 🚀 Quick Start

### Deployment on Netlify (Recommended)
1. Fork or upload this repository to your GitHub.
2. Connect the repo to **Netlify**.
3. Configure the following **Build Settings**:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. Add your **Environment Variables**:
   - `VITE_GEMINI_API_KEY`: Your Google AI Studio API Key.
   - `VITE_MISTRAL_API_KEY`: Your Mistral API Key (La Plateforme).

*No extra steps needed! Netlify will automatically install dependencies and launch your application.*

### Local Setup
```bash
# Install core dependencies (Including local Document Extractors)
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🛠️ Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS 4
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **AI Processing**: `@google/genai`, `@mistralai/mistralai`
- **Data Parsing Engines**: `pdfjs-dist` (PDFs), `mammoth` (Word Docs)
- **Content Rendering**: React-Markdown with GFM support

## 📝 License
SPDX-License-Identifier: Apache-2.0
