# 🤖 giscard AI - Multimodal Intelligence

A high-performance, feature-rich AI chatbot built with **React**, **Vite**, and **Google Gemini API**. Optimized for speed, versatility, and a premium user experience.

![giscard AI Banner](https://picsum.photos/seed/giscard-ai/1200/400)

## 🌟 Key Features

- **⚡ Instant Responses**: Powered by `gemini-3-flash-preview` with streaming enabled for near-zero latency.
- **📄 Document Analysis**: Upload **PDF**, **Docx**, or **PPTX** files and ask questions about them.
- **🎨 AI Image Generation**: Create stunning visuals directly in chat using `gemini-2.5-flash-image`.
- **💻 Code Expert**: Advanced syntax highlighting and reasoning for programming tasks.
- **🌍 Multilingual**: Seamless translation and language support.
- **📥 Export History**: Download your entire chat session as a formatted text file.
- **📱 PWA Ready**: Includes a web manifest for a native-like experience when saved to your homescreen.
- **🌓 Theme Aware**: Beautiful Dark and Light modes with a premium glass-morphism UI.

## 🚀 Quick Start

### Deployment on Netlify (Recommended)
1. Fork or upload this repository to your GitHub.
2. Connect the repo to **Netlify**.
3. Configure the following **Build Settings**:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. Add your **Environment Variable**:
   - `GEMINI_API_KEY`: Your Google AI Studio API Key.

### Local Setup
```bash
# Install dependencies
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
- **AI**: @google/genai (Gemini 3 Flash & Pro)
- **Markdown**: React-Markdown with GFM support

## 📝 License
SPDX-License-Identifier: Apache-2.0
