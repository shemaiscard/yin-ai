/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
// Providers consolidated to OpenRouter
import {
  Send,
  Bot,
  User,
  Loader2,
  Image as ImageIcon,
  Languages,
  Calculator,
  Code,
  FileText,
  Moon,
  Sun,
  Trash2,
  Download,
  Paperclip,
  X,
  Maximize2,
  Cpu,
  Copy,
  Check,
  BrainCircuit,
  Settings,
  ChevronDown,
  Sparkles,
  Zap,
  Mic,
  Volume2,
  VolumeX,
  MicOff,
  Plus,
  Presentation,
  Table,
  Brain
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { extractTextFromFile } from './utils/fileExtractor';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import pptxgen from 'pptxgenjs';
import * as XLSX from 'xlsx';

// Initialize OpenRouter Key
const getOpenRouterKey = () => {
  const key = (import.meta as any).env.VITE_OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
  if (!key || key === 'undefined') {
    console.warn('OpenRouter API Key not found. Please set VITE_OPENROUTER_API_KEY.');
  }
  return key || '';
};

// Array of fallback models in strict priority order (Free Models)
const FALLBACK_MODELS = [
  { id: 'google/gemini-2.0-flash-lite-preview-02-05:free', type: 'openrouter' },
  { id: 'google/gemini-1.5-flash:free', type: 'openrouter' },
  { id: 'meta-llama/llama-3-8b-instruct:free', type: 'openrouter' },
  { id: 'openrouter/free', type: 'openrouter' }
];

// System identity injected into every model
const SYSTEM_INSTRUCTION = `You are Giscard AI, a highly capable and intelligent multimodal assistant created by Shema Nkindi Giscard.

If the user specifically asks who you are or who created you, answer briefly: "I am Giscard AI, created by Shema Nkindi Giscard." Do NOT mention your creator unless specifically asked about it. Do NOT mention any underlying AI model names (such as Gemini, Mistral, GPT, etc.) under any circumstances.

Provide concise, summarized, and clear responses. Keep your answers brief but informative, avoiding unnecessary long text unless explicitly asked for a detailed explanation. When asked for code, ensure it is robust and clean. When asked for icons/graphics, generate pure, valid SVG code. Always be helpful and articulate.`;

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  type: 'text' | 'image' | 'file';
  files?: { name: string, type: string }[];
  timestamp: Date;
  isStreaming?: boolean;
}

export interface AttachedFile {
  name: string;
  data: string;
  type: string;
  extractedText?: string;
}

const CodeBlock = ({ children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4">
      <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="p-1.5 bg-white/10 hover:bg-white/20 rounded-md backdrop-blur-sm border border-white/10 text-white transition-all"
          title="Copy code"
        >
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="!bg-[#1e1e1e] !text-gray-200 !p-4 rounded-xl overflow-x-auto border border-white/5 font-mono text-sm leading-relaxed" {...props}>
        <code>{children}</code>
      </pre>
    </div>
  );
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [fileProgress, setFileProgress] = useState<number | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isUploadingToAI, setIsUploadingToAI] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setIsCreateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDocumentGeneration = async (type: string, topic: string, content: string) => {
    try {
      if (type === 'word') {
        const doc = new Document({
          sections: [{
            properties: {},
            children: content.split('\n').filter(p => p.trim()).map(p => new Paragraph({
              children: [new TextRun(p)],
              spacing: { after: 200 }
            }))
          }]
        });
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${topic.replace(/[^a-z0-9]/gi, '_')}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (type === 'ppt') {
        const pptx = new pptxgen();
        const slides = content.split('---SLIDE---');
        slides.forEach((slideContent) => {
          const lines = slideContent.split('\n').filter(l => l.trim());
          if (lines.length > 0) {
            const slide = pptx.addSlide();
            slide.addText(lines[0], { x: 0.5, y: 0.5, w: '90%', h: 1, fontSize: 32, bold: true, color: '363636' });
            if (lines.length > 1) {
              const bullets = lines.slice(1).map(l => l.replace(/^[-*•]\s*/, ''));
              slide.addText(bullets.join('\n'), { x: 0.5, y: 1.5, w: '90%', h: 4, fontSize: 18, bullet: true, color: '666666' });
            }
          }
        });
        await pptx.writeFile({ fileName: `${topic.replace(/[^a-z0-9]/gi, '_')}.pptx` });
      } else if (type === 'excel') {
        const rows = content.split('\n').filter(r => r.trim()).map(r => r.split(',').map(c => c.trim()));
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `${topic.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
      }
    } catch (e) {
      console.error('Doc gen error:', e);
    }
  };
  
  // Speech Recognition Setup
  const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setInput((prev) => {
           // We might want to handle prev nicely, but resetting or appending smartly is better
           // Since it's continuous interim results, we'll just set it
           return currentTranscript;
        });
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!SpeechRecognitionAPI) {
        alert("Speech Recognition is not supported by your browser.");
        return;
      }
      setInput(''); // clear input when starting new dictation
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const toggleMessageTTS = (messageId: string, text: string) => {
    if (playingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setPlayingMessageId(null);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Attempt to load higher quality, more human voices if supported by the browser/OS
      const voices = window.speechSynthesis.getVoices();
      const preferredVoices = voices.filter(v => 
        (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium') || v.name.includes('Microsoft')) && 
        v.lang.startsWith('en')
      );
      
      if (preferredVoices.length > 0) {
        // Try to favor the UK Google voice or Microsoft Azure Natural voices giving a much more human inflection
        const bestVoice = preferredVoices.find(v => v.name.includes('UK English Female') || v.name.includes('Aria') || v.name.includes('Natural')) || preferredVoices[0];
        utterance.voice = bestVoice;
      }

      utterance.pitch = 1.05; // Make voice slightly more energetic
      utterance.rate = 1.05;  // Speech pacing

      utterance.onend = () => setPlayingMessageId(null);
      utterance.onerror = () => setPlayingMessageId(null);
      setPlayingMessageId(messageId);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('yin-ai-chat-history');
    if (saved) {
      try {
        const parsed: Message[] = JSON.parse(saved);
        setMessages(parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
      } catch (e) {
        console.error('Failed to parse chat history', e);
      }
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (messages.length > 0) {
      // Strip potentially huge base64 data to avoid quota issues on normal text history
      const safelySerialized = messages.map(msg => {
         if (msg.type === 'file' && msg.files) {
            return { ...msg }; // LocalStorage limit shouldn't be hit immediately, but if needed we can drop msg.files
         }
         return msg;
      });
      localStorage.setItem('yin-ai-chat-history', JSON.stringify(safelySerialized));
    }
  }, [messages]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('yin-ai-chat-history');
  };

  const downloadChat = () => {
    if (messages.length === 0) return;

    const chatText = messages.map(msg => {
      const time = msg.timestamp.toLocaleString();
      const role = msg.role === 'user' ? 'YOU' : 'Giscard AI';
      const content = msg.type === 'image' ? '[Generated Image]' :
        msg.type === 'file' ? `[Attached Files: ${msg.files?.map(f => f.name).join(', ')}]` : msg.content;
      return `[${time}] ${role}:\n${content}\n${'-'.repeat(40)}`;
    }).join('\n\n');

    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yin-ai-chat-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setFileProgress(0);
    const newFiles: AttachedFile[] = [];
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_FILE_SIZE) {
        alert(`File ${file.name} is too large. Max size is 5MB.`);
        continue;
      }

      try {
        let extractedText = undefined;
        if (!file.type.startsWith('image/')) {
          extractedText = await extractTextFromFile(file);
        }

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newFiles.push({
          name: file.name,
          data: base64.split(',')[1],
          type: file.type,
          extractedText
        });
      } catch (err: any) {
        alert(`Error reading file ${file.name}: ${err.message}`);
      }

      setFileProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setAttachedFiles(prev => [...prev, ...newFiles]);
    // Ensure progress bar is visible for at least a moment
    setTimeout(() => setFileProgress(null), 800);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generateResponse = async (userInput: string) => {
    if (!userInput.trim() && attachedFiles.length === 0) return;
    setIsLoading(true);

    // Simulate "Upload to AI" progress with a guaranteed minimum visibility
    setIsUploadingToAI(true);
    await new Promise(resolve => setTimeout(resolve, 1200)); 
    setIsUploadingToAI(false);

    const currentFiles = [...attachedFiles];

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput || (currentFiles.length > 0 ? `Uploaded ${currentFiles.length} file(s)` : ''),
      type: currentFiles.length > 0 ? 'file' : 'text',
      files: currentFiles.map(f => ({ name: f.name, type: f.type })),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachedFiles([]);

    // Dynamic System Instruction with Timezone and Local Time
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let dynamicSystemInstruction = `${SYSTEM_INSTRUCTION}\n\n[SYSTEM INFO]\nThe current date and time is: ${new Date().toLocaleString()}, in the timezone: ${userTimeZone}. Use this to accurately calculate global times if asked.`;

    if (userInput.toLowerCase().includes('creator') || userInput.toLowerCase().includes('who made you') || userInput.toLowerCase().includes('who created you') || userInput.toLowerCase().includes('who are you')) {
       dynamicSystemInstruction += `\n\n[CREATOR BACKGROUND]: Shema Nkindi Giscard is a versatile full-stack software developer based in Seoul, Korea, with expertise in web development (Python, React, Flask, Django), computer graphics (Blender, OpenGL), cybersecurity (cryptography, network recon), and AI/ML. Projects: Ze Video Downloader, Ze Matrix, Cipher Shield Suite, LogoScope. Portfolio: https://www.giscard.me`;
    }

    let isDocGen = false;
    let docType = '';
    let docTopic = '';

    const lowerInput = userInput.toLowerCase();
    if (lowerInput.startsWith('create a word doc about ')) {
      isDocGen = true; docType = 'word'; docTopic = userInput.substring(24).trim();
    } else if (lowerInput.startsWith('create a powerpoint about ')) {
      isDocGen = true; docType = 'ppt'; docTopic = userInput.substring(26).trim();
    } else if (lowerInput.startsWith('create an excel sheet about ')) {
      isDocGen = true; docType = 'excel'; docTopic = userInput.substring(28).trim();
    }

    if (isDocGen) {
      if (docType === 'word') {
         dynamicSystemInstruction += `\n\nThe user requested a Word document about "${docTopic}". Please provide ONLY the raw content for the document. No markdown blocks wrapping the text. Include a title, introduction, 3-5 main sections, and a conclusion.`;
      } else if (docType === 'ppt') {
         dynamicSystemInstruction += `\n\nThe user requested a PowerPoint presentation about "${docTopic}". Please provide the content in strict format. Separate slides with "---SLIDE---". For each slide, put the title on the first line, and bullet points on following lines. No markdown blocks.`;
      } else if (docType === 'excel') {
         dynamicSystemInstruction += `\n\nThe user requested an Excel sheet about "${docTopic}". Please provide ONLY a valid CSV format table. No markdown tables or code blocks. The first row must be headers, followed by data rows.`;
      }
    }

    // Check for image generation request using robust regex
    const imageMatch = lowerInput.match(/^(?:generate|create|make|draw|imagine|show me)(?: me)?(?: an?)?\s+(.*(?:image|picture|photo|drawing).*)/i) 
                    || lowerInput.match(/^(?:generate|create|make|draw|imagine|show me)(?: me)?(?: an?)?\s+(.*)/i);
    
    let isImageGen = false;
    let imagePrompt = '';
    
    // If it mentions image/drawing/picture AND an action verb, or starts with draw/imagine
    if ((lowerInput.includes('generate') || lowerInput.includes('create') || lowerInput.includes('draw') || lowerInput.includes('imagine')) && 
        (lowerInput.includes('image') || lowerInput.includes('picture') || lowerInput.includes('photo') || lowerInput.startsWith('draw') || lowerInput.startsWith('imagine'))) {
        
        // Prevent avatar requests from being caught here
        if (!lowerInput.includes('avatar')) {
            isImageGen = true;
            imagePrompt = lowerInput
                .replace(/^(generate|create|make|draw|imagine|show me)(\s+me)?(\s+an?)?\s+/i, '')
                .replace(/\b(image|picture|photo)s?\b/gi, '')
                .trim() || userInput;
        }
    }

    // Check for avatar generation request
    let isAvatarGen = false;
    let avatarSeed = '';
    if (lowerInput.includes('avatar') && (lowerInput.includes('create') || lowerInput.includes('generate') || lowerInput.includes('draw') || lowerInput.includes('make'))) {
        isAvatarGen = true;
        avatarSeed = lowerInput
            .replace(/^(generate|create|make|draw|imagine|show me)(\s+me)?(\s+an?)?\s+/i, '')
            .replace(/\bavatars?\b/gi, '')
            .replace(/\bfor\b/gi, '')
            .trim() || userInput;
    }

    let modelIndex = 0;
    let success = false;

    const aiMessageId = (Date.now() + 1).toString();
    const initialAiMessage: Message = {
      id: aiMessageId,
      role: 'ai',
      content: '',
      type: 'text',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, initialAiMessage]);
    setIsLoading(false);

    // Handle Image Generation via Pollinations.ai instantly
    if (isImageGen && imagePrompt.trim() !== '') {
        setIsThinking(true);
        const encodedPrompt = encodeURIComponent(imagePrompt);
        const seed = Math.floor(Math.random() * 1000000); // randomize
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&nologo=True`;
        
        // Load the image behind the scenes before showing
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => {
            setIsThinking(false);
            setMessages(prev => prev.map(msg => 
                msg.id === aiMessageId 
                    ? { ...msg, type: 'image', content: imageUrl, isStreaming: false } 
                    : msg
            ));
        };
        img.onerror = () => {
            setIsThinking(false);
            setMessages(prev => prev.map(msg => 
                msg.id === aiMessageId 
                    ? { ...msg, type: 'text', content: "Failed to generate image. Try again.", isStreaming: false } 
                    : msg
            ));
        };
        return; // Skip LLM generation
    }

    // Handle Avatar Generation via DiceBear instantly
    if (isAvatarGen && avatarSeed.trim() !== '') {
        setIsThinking(true);
        const encodedSeed = encodeURIComponent(avatarSeed);
        const avatarUrl = `https://api.dicebear.com/8.x/bottts/svg?seed=${encodedSeed}`;
        
        const img = new Image();
        img.src = avatarUrl;
        img.onload = () => {
            setIsThinking(false);
            setMessages(prev => prev.map(msg => 
                msg.id === aiMessageId 
                    ? { ...msg, type: 'image', content: avatarUrl, isStreaming: false } 
                    : msg
            ));
        };
        img.onerror = () => {
            setIsThinking(false);
            setMessages(prev => prev.map(msg => 
                msg.id === aiMessageId 
                    ? { ...msg, type: 'text', content: "Failed to generate avatar. Try again.", isStreaming: false } 
                    : msg
            ));
        };
        return; // Skip LLM generation
    }

    while (modelIndex < FALLBACK_MODELS.length && !success) {
      const currentModel = FALLBACK_MODELS[modelIndex];

      try {
        setIsThinking(true);
        let fullText = '';

        // Prepare messages for OpenRouter (OpenAI compatible)
        const openRouterMessages: any[] = [
          { role: 'system', content: dynamicSystemInstruction },
          ...messages.filter(m => !m.isStreaming).map(m => {
             // Handle conversation memory
             let content = m.content;
             if (m.type === 'file' && m.files) {
                const fileList = m.files.map(f => f.name).join(', ');
                content = `[Attached Files: ${fileList}]\n${m.content}`;
             }
             return {
                role: m.role === 'user' ? 'user' : 'assistant',
                content: content
             };
          })
        ];

        // Current user message with multimodal support
        const currentContent: any[] = [{ type: 'text', text: userInput || "Analyze the following." }];
        
        currentFiles.forEach(file => {
          if (file.extractedText) {
            currentContent.push({ type: 'text', text: `\n--- Document: ${file.name} ---\n${file.extractedText}\n--- End Document ---\n` });
          } else if (file.type.startsWith('image/')) {
            currentContent.push({ 
              type: 'image_url', 
              image_url: { url: `data:${file.type};base64,${file.data}` } 
            });
          }
        });

        openRouterMessages.push({ role: 'user', content: currentContent });

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getOpenRouterKey()}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://giscard.me',
            'X-Title': 'Giscard AI',
          },
          body: JSON.stringify({
            model: currentModel.id,
            messages: openRouterMessages,
            stream: true,
            temperature: 0.5,
          })
        });

        if (!response.ok) {
           const errData = await response.json().catch(() => ({}));
           throw new Error(errData?.error?.message || `OpenRouter error: ${response.status}`);
        }

        setIsThinking(false);
        const reader = response.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
              const dataText = line.replace('data: ', '').trim();
              if (dataText === '[DONE]') break;
              
              try {
                const data = JSON.parse(dataText);
                const delta = data.choices[0]?.delta?.content;
                if (delta) {
                  fullText += delta;
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId ? { ...msg, content: fullText } : msg
                  ));
                }
              } catch (e) {
                // Ignore partial JSON parse errors
              }
            }
          }
        }

        if (isDocGen) {
           await handleDocumentGeneration(docType, docTopic, fullText);
           setMessages(prev => prev.map(msg =>
              msg.id === aiMessageId ? { ...msg, content: `✅ I've created the ${docType.toUpperCase()} file about "${docTopic}". It should download automatically!`, isStreaming: false } : msg
           ));
        } else {
           setMessages(prev => prev.map(msg =>
             msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg
           ));
        }
        success = true;
      } catch (error: any) {
        console.error(`Error with model ${currentModel.id}:`, error);

        if (modelIndex < FALLBACK_MODELS.length - 1) {
          modelIndex++;
          console.log(`Fallback: Switching to next model ${FALLBACK_MODELS[modelIndex].id}`);
          continue;
        }

        setIsThinking(false);
        let errorMsg = 'I encountered an error. This might be due to file size, type, or API quota. Please try again.';
        if (error?.message?.includes('quota') || error?.message?.includes('429')) {
          errorMsg = '⚠️ **Quota Exceeded (Error 429)**: All available AI models have reached their usage limits on OpenRouter.';
        }

        setMessages(prev => prev.map(msg =>
          msg.id === aiMessageId ? { ...msg, content: errorMsg, isStreaming: false } : msg
        ));
        success = true;
      }
    }
    setIsLoading(false);
  };

  const removeStagedFile = (idxToRemove: number) => {
    setAttachedFiles(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || attachedFiles.length > 0) && !isLoading) {
      generateResponse(input);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300 p-2 md:p-6 lg:p-8 flex items-center justify-center">
      <div className="main-container flex flex-col w-full h-[95vh] max-h-[1000px] shadow-2xl border border-[var(--bg-secondary)]">
        {/* Header */}
        <header className="flex justify-between items-center mb-4 border-b border-[var(--bg-secondary)] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] rounded-xl text-white shadow-lg">
              <Cpu size={28} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-[var(--primary-color)] to-[var(--accent-color)] bg-clip-text text-transparent">Giscard AI</h1>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-semibold"></p>
            </div>
          </div>
          <div className="flex gap-1 md:gap-2">
            <button onClick={downloadChat} disabled={messages.length === 0} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-all text-[var(--text-secondary)] disabled:opacity-20" title="Export History"><Download size={18} /></button>
            <button onClick={clearChat} disabled={messages.length === 0} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-all text-[var(--text-secondary)] disabled:opacity-20" title="Clear Chat"><Trash2 size={18} /></button>
            <div className="w-[1px] h-6 bg-[var(--bg-secondary)] mx-1" />
            <button onClick={toggleTheme} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-all text-[var(--text-secondary)]">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>

        {/* Features Grid */}
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto py-8">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-2">How can I help you today?</h2>
              <p className="text-[var(--text-secondary)]">Upload documents, generate art, or just chat.</p>
            </motion.div>
            <div className="grid grid-cols-3 gap-2 w-full max-w-2xl px-2">
              {[
                { icon: <FileText size={18} />, title: "Docs", color: "var(--primary-color)" },
                { icon: <ImageIcon size={18} />, title: "Images", color: "var(--accent-color)" },
                { icon: <Code size={18} />, title: "Code", color: "var(--secondary-color)" },
                { icon: <Calculator size={18} />, title: "Math", color: "var(--success-color)" },
                { icon: <Languages size={18} />, title: "Translate", color: "var(--warning-color)" },
                { icon: <Maximize2 size={18} />, title: "Summary", color: "var(--primary-color)" }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -2 }}
                  className="info-card !m-0 flex flex-col items-center justify-center text-center gap-1 p-2 cursor-pointer hover:border-[var(--primary-color)] border border-transparent transition-all rounded-xl"
                >
                  <div style={{ color: item.color }} className="mb-0.5">{item.icon}</div>
                  <h3 className="font-bold text-[10px] md:text-xs leading-none">{item.title}</h3>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className={`overflow-y-auto pb-12 pr-2 space-y-6 custom-scrollbar ${messages.length === 0 ? 'hidden' : 'flex-1 mb-4'}`}>
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`p-2.5 rounded-xl h-fit shadow-sm ${msg.role === 'user' ? 'bg-[var(--primary-color)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--primary-color)]'}`}>
                  {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className={`chat-message shadow-sm ${msg.role === 'user' ? 'user-message !bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)]' : 'ai-message border border-[var(--bg-secondary)]'}`}>
                  {msg.type === 'image' ? (
                    <div className="group relative">
                      <img src={msg.content} alt="AI Generated" className="rounded-lg max-w-full h-auto shadow-lg transition-transform hover:scale-[1.02]" referrerPolicy="no-referrer" />
                      <button className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Download size={14} /></button>
                    </div>
                  ) : msg.type === 'file' ? (
                    <div className="flex flex-col gap-2">
                       {msg.content && (
                          <div className={`text-sm md:text-base whitespace-pre-wrap leading-relaxed ${msg.role === 'user' ? 'text-white' : ''}`}>
                             {msg.content}
                          </div>
                       )}
                      <div className="flex flex-wrap gap-2 mt-1">
                        {msg.files?.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-white/10 rounded-lg w-fit">
                            <FileText size={16} />
                            <div className="flex flex-col">
                              <span className="text-xs font-medium truncate max-w-[150px]">{f.name}</span>
                              <span className="text-[9px] opacity-70">Uploaded</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : msg.role === 'user' ? (
                     <div className="text-sm md:text-base text-white whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                     </div>
                  ) : (
                    <div className="prose dark:prose-invert max-w-none leading-relaxed text-sm md:text-base">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <CodeBlock language={match[1]} {...props}>{String(children).replace(/\n$/, '')}</CodeBlock>
                            ) : (
                              <code className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-[var(--accent-color)] font-mono text-[13px]" {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                  <div className={`flex items-center justify-between mt-2 pt-2 border-t border-white/5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`text-[9px] opacity-40 font-mono ${msg.role === 'user' ? 'text-right' : ''}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {msg.role === 'ai' && !msg.isStreaming && msg.type === 'text' && (
                      <button 
                        onClick={() => toggleMessageTTS(msg.id, msg.content)}
                        className="p-1 hover:bg-[var(--bg-secondary)] rounded transition-colors text-[var(--text-secondary)] opacity-50 hover:opacity-100"
                        title="Read aloud"
                      >
                        {playingMessageId === msg.id ? <VolumeX size={12} /> : <Volume2 size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isThinking && (
            <div className="flex gap-3">
              <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] text-[var(--primary-color)] h-fit shadow-sm">
                <BrainCircuit size={18} className="animate-pulse" />
              </div>
              <div className="ai-message chat-message flex flex-col gap-2 border border-[var(--bg-secondary)] !bg-[var(--bg-secondary)]/50">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-[var(--primary-color)] rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-[var(--primary-color)] rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1 h-1 bg-[var(--primary-color)] rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary-color)]">Giscard AI is thinking...</span>
                </div>
                <div className="h-2 w-32 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="h-full w-1/2 bg-gradient-to-r from-transparent via-[var(--primary-color)] to-transparent"
                  />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="relative">
          {fileProgress !== null && (
            <div className="absolute bottom-full left-0 w-full mb-2 bg-[var(--bg-secondary)] rounded-lg p-3 shadow-xl border border-[var(--primary-color)]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-[var(--primary-color)]" />
                  Reading File...
                </span>
                <span className="text-xs font-mono font-bold text-[var(--primary-color)]">{fileProgress}%</span>
              </div>
              <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${fileProgress}%` }}
                  className="h-full bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)]"
                />
              </div>
            </div>
          )}
          {isUploadingToAI && (
            <div className="absolute bottom-full left-0 w-full mb-2 bg-[var(--bg-secondary)] rounded-lg p-3 shadow-xl border border-[var(--primary-color)]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-[var(--primary-color)]" />
                  Uploading to AI limits...
                </span>
              </div>
              <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.8, ease: "linear" }}
                  className="h-full bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)]"
                />
              </div>
            </div>
          )}

          {attachedFiles.length > 0 && !fileProgress && !isUploadingToAI && (
            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute bottom-full left-0 mb-2 flex gap-2 overflow-x-auto max-w-full pb-1 custom-scrollbar">
              {attachedFiles.map((f, idx) => (
                <div key={idx} className="p-2 bg-[var(--bg-secondary)] rounded-lg flex items-center gap-2 shadow-lg border border-[var(--primary-color)] whitespace-nowrap">
                  <FileText size={16} className="text-[var(--primary-color)]" />
                  <span className="text-xs truncate max-w-[120px]">{f.name}</span>
                  <button onClick={() => removeStagedFile(idx)} className="p-1 hover:bg-red-500/10 text-red-500 rounded-full"><X size={14} /></button>
                </div>
              ))}
            </motion.div>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2 items-end bg-[var(--bg-secondary)] p-2 rounded-2xl border-2 border-transparent focus-within:border-[var(--primary-color)] transition-all">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors"
            >
              <Paperclip size={22} />
            </button>
            <div className="relative" ref={createMenuRef}>
              <button
                type="button"
                onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                className="p-3 text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors"
                title="Create Document"
              >
                <Plus size={22} />
              </button>
              {isCreateMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-[var(--bg-primary)] border border-[var(--bg-secondary)] rounded-xl shadow-2xl py-2 z-50">
                   <button type="button" onClick={() => { setInput("Create a Word doc about "); setIsCreateMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-[var(--bg-secondary)] flex items-center gap-2 text-sm transition-colors cursor-pointer"><FileText size={16} className="inline mr-2"/> Word Document</button>
                   <button type="button" onClick={() => { setInput("Create a PowerPoint about "); setIsCreateMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-[var(--bg-secondary)] flex items-center gap-2 text-sm transition-colors cursor-pointer"><Presentation size={16} className="inline mr-2"/> PowerPoint Slide</button>
                   <button type="button" onClick={() => { setInput("Create an Excel sheet about "); setIsCreateMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-[var(--bg-secondary)] flex items-center gap-2 text-sm transition-colors cursor-pointer"><Table size={16} className="inline mr-2"/> Excel Sheet</button>
                   <button type="button" onClick={() => { setInput("Create a quiz about "); setIsCreateMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-[var(--bg-secondary)] flex items-center gap-2 text-sm transition-colors cursor-pointer"><Brain size={16} className="inline mr-2"/> Quiz / Flashcards</button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={toggleListening}
              className={`p-3 transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-[var(--text-secondary)] hover:text-[var(--primary-color)]'}`}
              title="Dictate"
            >
              {isListening ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
              accept=".pdf,.docx,.pptx,.txt,.csv,.md,.png,.jpg,.jpeg,.svg"
            />
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-resize textarea
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Message..."
              disabled={isLoading}
              rows={1}
              className="flex-1 bg-transparent border-none focus:ring-0 p-3 text-sm resize-none max-h-32 overflow-y-auto"
            />
            <button
              type="submit"
              disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
              className="p-3 bg-[var(--primary-color)] text-white rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-20 disabled:scale-100"
            >
              <Send size={20} />
            </button>
          </form>
          <div className="flex justify-between items-center mt-2 px-1">
            <p className="text-[9px] text-[var(--text-secondary)] opacity-50">Giscard AI can make mistakes. Verify important info.</p>
            {input.length > 0 && (
              <span className={`text-[9px] font-mono opacity-60 ${input.length > 3800 ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>
                {input.length}/4000
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
