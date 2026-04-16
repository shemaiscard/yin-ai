/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Mistral } from '@mistralai/mistralai';
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
  MicOff
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { extractTextFromFile } from './utils/fileExtractor';

// Initialize Gemini API
const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
  if (!key || key === 'undefined') {
    console.warn('Gemini API Key not found. Please set GEMINI_API_KEY or VITE_GEMINI_API_KEY.');
  }
  return key || '';
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

// Initialize Mistral API
const getMistralKey = () => {
  const key = process.env.MISTRAL_API_KEY || (import.meta as any).env.VITE_MISTRAL_API_KEY;
  if (!key || key === 'undefined') {
    console.warn('Mistral API Key not found. Please set MISTRAL_API_KEY or VITE_MISTRAL_API_KEY.');
  }
  return key || '';
};

const mistral = new Mistral({ apiKey: getMistralKey() });

// Array of fallback models in strict priority order invisible to user
const FALLBACK_MODELS = [
  { id: 'gemini-3-flash-preview', type: 'gemini', provider: 'google' },
  { id: 'gemini-3.1-flash-lite-preview', type: 'gemini', provider: 'google' },
  { id: 'gemini-flash-latest', type: 'gemini', provider: 'google' },
  { id: 'mistral-small-latest', type: 'mistral', provider: 'mistral' }
];

// System identity injected into every model
const SYSTEM_INSTRUCTION = `You are Giscard AI, a highly capable and intelligent multimodal assistant created by Shema Nkindi Giscard — a versatile software developer based in Seoul, Korea, with expertise in web development, computer graphics, cybersecurity, and artificial intelligence. Giscard built Giscard AI to provide intelligent, multimodal assistance to users worldwide.

About your creator, Shema Nkindi Giscard:
- Full-stack developer skilled in Python, React, Flask, Django, Java, C++, and SQL
- Expert in Computer Vision (OpenCV, DeepFace), AI/ML (TensorFlow), and 3D Graphics (Blender, OpenGL)
- Specializes in Cybersecurity: cryptography (AES, RSA, Twofish), network recon (Nmap), and secure auth systems
- Creator of multiple projects: Ze Video Downloader, Ze Matrix, Cipher Shield Suite, LogoScope, Zarduino, Amakarita, and more
- Portfolio: https://www.giscard.me

When a user directly asks who you are, who made you, or who created you — respond clearly: "I am Giscard AI, created by Shema Nkindi Giscard." You may elaborate warmly about your creator if the user seems curious. Do NOT mention any underlying AI model names (such as Gemini, Mistral, GPT, etc.) under any circumstances.

Provide detailed, well-structured, and comprehensive responses. Use clear paragraphs, logical formatting, and expand on complex topics when necessary. When asked for code, ensure it is robust and clean. When asked for icons/graphics, generate pure, valid SVG code. Always be helpful, articulate, and thorough.`;

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
      <pre className="!bg-[#1e1e1e] !p-4 rounded-xl overflow-x-auto border border-white/5 font-mono text-sm leading-relaxed" {...props}>
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
    setFileProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generateResponse = async (userInput: string) => {
    if (!userInput.trim() && attachedFiles.length === 0) return;
    setIsLoading(true);

    // Simulate "Upload to AI" progress
    setIsUploadingToAI(true);
    await new Promise(resolve => setTimeout(resolve, 800)); // Brief simulated wait or processing time
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
    const dynamicSystemInstruction = `${SYSTEM_INSTRUCTION}\n\n[SYSTEM INFO]\nThe current date and time is: ${new Date().toLocaleString()}, in the timezone: ${userTimeZone}. Use this to accurately calculate global times if asked.`;

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

    while (modelIndex < FALLBACK_MODELS.length && !success) {
      const currentModel = FALLBACK_MODELS[modelIndex];

      try {
        setIsThinking(true);
        let fullText = '';

        if (currentModel.type === 'gemini') {
          const parts: any[] = [{ text: userInput || "Analyze the following." }];

          currentFiles.forEach(file => {
            if (file.extractedText) {
              parts.push({ text: `\n--- Document: ${file.name} ---\n${file.extractedText}\n--- End Document ---\n` });
            } else {
              parts.push({
                inlineData: {
                  data: file.data,
                  mimeType: file.type || 'application/octet-stream'
                }
              });
            }
          });

          // Define tools for Gemini (enable google search grounding)
          // Some environments/model versions might throw if tools is passed but unsupported,
          // however gemini-flash and pro 1.5/2.0 normally support it
          const config: any = {
            systemInstruction: dynamicSystemInstruction,
            tools: [{ googleSearch: {} }]
          };

          const responseStream = await ai.models.generateContentStream({
            model: currentModel.id,
            contents: [{ role: 'user', parts }],
            config: config
          });

          setIsThinking(false);
          for await (const chunk of responseStream) {
            const chunkText = chunk.text;
            if (chunkText) {
              fullText += chunkText;
              setMessages(prev => prev.map(msg =>
                msg.id === aiMessageId ? { ...msg, content: fullText } : msg
              ));
            }
          }
        } else {
          // Mistral AI
          const systemMsg = dynamicSystemInstruction;

          const contentParts: any[] = [{ type: 'text', text: userInput || "Analyze the following files." }];

          let hasPPTX = false;
          currentFiles.forEach(file => {
            if (file.name.endsWith('.pptx')) {
              hasPPTX = true;
            }
            if (file.extractedText) {
              contentParts.push({ type: 'text', text: `\n--- Document: ${file.name} ---\n${file.extractedText}\n--- End Document ---\n` });
            } else if (file.type.startsWith('image/')) {
              contentParts.push({ type: 'image_url', image_url: `data:${file.type};base64,${file.data}` });
            }
          });

          if (hasPPTX && currentModel.type === 'mistral') {
            alert('Warning: PPTX extraction is currently not fully supported by this model. To analyze PPTX thoroughly, please select a Gemini model, or convert to PDF/Text first.');
          }

          const messages: any[] = [
            { role: 'system', content: systemMsg },
            { role: 'user', content: contentParts.length > 1 ? contentParts : (userInput || "Hello!") }
          ];

          const responseStream = await mistral.chat.stream({
            model: currentModel.id,
            messages: messages,
          });

          setIsThinking(false);
          for await (const chunk of responseStream) {
            const chunkText = chunk.data.choices[0].delta.content;
            if (typeof chunkText === 'string') {
              fullText += chunkText;
              setMessages(prev => prev.map(msg =>
                msg.id === aiMessageId ? { ...msg, content: fullText } : msg
              ));
            }
          }
        }

        setMessages(prev => prev.map(msg =>
          msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg
        ));
        success = true;
      } catch (error: any) {
        console.error(`Error with model ${currentModel.id}:`, error);

        const isQuotaError = error?.message?.includes('quota') || error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED' || error?.status === 429;

        if (isQuotaError && modelIndex < FALLBACK_MODELS.length - 1) {
          modelIndex++;
          console.log(`Switching to next model: ${FALLBACK_MODELS[modelIndex].id}`);
          continue;
        }

        setIsThinking(false);
        let errorMsg = 'I encountered an error. This might be due to file size, type, or API quota. Please try again.';

        if (isQuotaError) {
          errorMsg = '⚠️ **Quota Exceeded (Error 429)**: All available AI models have reached their usage limits. \n\n**How to fix:**\n1. If you just updated the key on Netlify, you **MUST** go to Deploys > Trigger Deploy > **Clear cache and deploy site**.\n2. Check your [Google AI Studio Plan](https://aistudio.google.com/app/plan_and_billing) or Mistral account.';
        } else if (error?.message?.includes('API key') || error?.message?.includes('403')) {
          errorMsg = 'There is an issue with the API key configuration. Please check your environment variables.';
        }

        setMessages(prev => prev.map(msg =>
          msg.id === aiMessageId ? { ...msg, content: errorMsg, isStreaming: false } : msg
        ));
        success = true; // Stop loop
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-3xl">
              {[
                { icon: <FileText size={24} />, title: "Analyze Docs", desc: "PDF, Docx, PPTX", color: "var(--primary-color)" },
                { icon: <ImageIcon size={24} />, title: "SVG & Icons", desc: "Code-based graphics", color: "var(--accent-color)" },
                { icon: <Code size={24} />, title: "Code Helper", desc: "Debug & Write", color: "var(--secondary-color)" },
                { icon: <Calculator size={24} />, title: "Math Expert", desc: "Solve Equations", color: "var(--success-color)" },
                { icon: <Languages size={24} />, title: "Translate", desc: "Global Support", color: "var(--warning-color)" },
                { icon: <Maximize2 size={24} />, title: "Summarize", desc: "Long Texts", color: "var(--primary-color)" }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -5 }}
                  className="info-card !m-0 flex flex-col items-center text-center gap-2 p-4 cursor-pointer hover:border-[var(--primary-color)] border border-transparent transition-all"
                >
                  <div style={{ color: item.color }}>{item.icon}</div>
                  <h3 className="font-bold text-sm">{item.title}</h3>
                  <p className="text-[10px] text-[var(--text-secondary)]">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto mb-4 pr-2 space-y-6 custom-scrollbar">
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
              placeholder="Message Giscard AI… (Shift+Enter for new line)"
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
