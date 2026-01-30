"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useParams, useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SpeechToTextInput from "@/components/ui/speech-to-text-input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { API_URL } from "@/lib/config";
import { uploadFilesToS3, S3UploadedFile } from "@/lib/s3-upload";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Plus,
  MessageSquare,
  MoreHorizontal,
  X,
  ArrowLeft,
  User,
  LogIn,
  LogOut,
  FileText,
  ChevronDown,
  ChevronUp,
  Edit2,
  Copy,
  Check,
  ArrowUp,
  Paperclip,
  Image as ImageIcon,
  File as FileIcon,
  Menu,
  UserCircle,
  Phone,
  Volume2,
  VolumeX,
  Languages,
} from "lucide-react";
import FilePreviewModal from "@/components/chat/FilePreviewModal";
import { RootState } from "@/store/store";
import { logout, loadUserFromStorage } from "@/store/slices/authSlice";
import { usePlanLimitations } from "@/hooks/usePlanLimitations";
import { UsageStatusBar } from "@/components/usage/UsageStatusBar";
import { LimitReachedModal } from "@/components/usage/LimitReachedModal";
import { MonthlyWarningModal } from "@/components/usage/MonthlyWarningModal";

interface FileAttachment {
  name: string;
  type: string;
  url: string;
  size: number;
}

interface ChatMessage {
  id: string;
  type: "user" | "agent";
  text: string;
  timestamp: Date;
  toolCalls?: Array<{
    function: string;
    query: string;
    results_count: number;
  }>;
  sources?: Array<{
    source: string;
    score: number;
    page?: number;
    text?: string;
  }>;
  files?: FileAttachment[];
  isStreaming?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  timestamp: Date;
  messages: ChatMessage[];
}

interface Publication {
  primary_color: string;
  secondary_color: string;
  theme: string;
  is_private: boolean;
}

const ExpertChatPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const slug = params.slug as string;

  const convertS3UrlToProxy = (s3Url: string): string => {
    if (!s3Url) return s3Url as any;
    const match = s3Url.match(
      /https:\/\/ai-dilan\.s3\.[^/]+\.amazonaws\.com\/(.+)/,
    );
    if (match) {
      return `${API_URL}/images/avatar/full/${match[1]}`;
    }
    return s3Url;
  };

  // Handle expert avatar loading
  const handleExpertImageLoad = useCallback(() => {
    setExpertImageLoading(false);
  }, []);

  const handleExpertImageError = useCallback(() => {
    setExpertImageLoading(false);
    setExpertImageError(true);
  }, []);

  // Handle user avatar loading
  const handleUserImageLoad = useCallback(() => {
    setUserImageLoading(false);
  }, []);

  const handleUserImageError = useCallback(() => {
    setUserImageLoading(false);
    setUserImageError(true);
  }, []);

  // Auth state from Redux
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth,
  );

  const [expert, setExpert] = useState<any>(null);
  const [publication, setPublication] = useState<Publication | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null); // OpenAI session
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState("");
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingExpert, setIsLoadingExpert] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null);
  const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);
  const [translatedMessages, setTranslatedMessages] = useState<Map<string, { text: string; language: string }>>(new Map());
  const [openTranslateDropdown, setOpenTranslateDropdown] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [audioCache, setAudioCache] = useState<Map<string, string>>(new Map());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(
    new Set(),
  );
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [expertImageLoading, setExpertImageLoading] = useState(true);
  const [expertImageError, setExpertImageError] = useState(false);
  const [userImageLoading, setUserImageLoading] = useState(true);
  const [userImageError, setUserImageError] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    right: 0,
  });
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null);
  const [previewFiles, setPreviewFiles] = useState<FileAttachment[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExpertOwner, setIsExpertOwner] = useState(false);
  const [usageRefreshTrigger, setUsageRefreshTrigger] = useState(0);  // Add refresh trigger
  
  // Monthly warning modal state
  const [monthlyWarningModal, setMonthlyWarningModal] = useState<{
    isOpen: boolean;
    warningMessage: string;
    currentUsage: number;
    monthlyThreshold: number;
    usageType: string;
    planName: string;
    subscriptionMonths: number;
  }>({
    isOpen: false,
    warningMessage: "",
    currentUsage: 0,
    monthlyThreshold: 0,
    usageType: "",
    planName: "",
    subscriptionMonths: 0,
  });

  // Limit reached modal state
  const [showLimitReachedModal, setShowLimitReachedModal] = useState(false);

  // Plan limitations hook
  const {
    usage,
    limitStatus,
    currentPlan,
    subscription,
    loading: planLoading,
    error: planError,
    refreshUsage,
    trackUsage,
    checkCanSendMessage,
    checkCanMakeCall,
    getRemainingUsage,
  } = usePlanLimitations({
    expertId: expert?.id || "",
    enabled: isAuthenticated && !!expert?.id,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userMenuTriggerRef = useRef<HTMLButtonElement>(null);

  // Speech Recognition States
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldIgnoreRecognitionRef = useRef<boolean>(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Load user from storage on mount
  useEffect(() => {
    dispatch(loadUserFromStorage());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionId) {
        endChatSession();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // Close translate dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openTranslateDropdown) {
        const target = event.target as Element;
        const dropdown = target.closest('.translate-dropdown-container');
        if (!dropdown) {
          setOpenTranslateDropdown(null);
        }
      }
    };

    if (openTranslateDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openTranslateDropdown]);

  // Auto-connect when expert is loaded
  useEffect(() => {
    const loadExpert = async () => {
      try {
        setIsLoadingExpert(true);
        // Fetch expert data directly by ID (no publication required)
        const res = await fetch(`${API_URL}/experts/${slug}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("dilan_ai_token")}`,
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();
        if (data.success && data.expert) {
          setExpert({
            ...data.expert,
            avatar_url: data.expert?.avatar_url
              ? convertS3UrlToProxy(data.expert.avatar_url)
              : null,
          });
          
          // Check if current user is the expert owner
          if (user && data.expert && String(data.expert.user_id) === String(user.id)) {
            setIsExpertOwner(true);
            console.log("🎯 Expert owner detected:", user.id, "owns expert", data.expert.id);
          } else {
            setIsExpertOwner(false);
          }
          // Set default publication data for styling
          setPublication({
            primary_color: "#3B82F6",
            secondary_color: "#1E40AF",
            theme: "default",
            is_private: false,
          });
          // Reset image loading states when expert data changes
          if (data.expert?.avatar_url) {
            setExpertImageLoading(true);
            setExpertImageError(false);
          }

          // Debug logging
          console.log("🔍 Publication data:", {
            is_private: data.publication?.is_private,
            isAuthenticated: isAuthenticated,
            user: user,
          });

          // Check if publication is private and user is not authenticated
          if (data.publication?.is_private && !isAuthenticated) {
            console.log("🔒 Private publication - authentication required");
            setIsLoadingExpert(false);
            // Don't auto-connect, show auth modal instead
            return;
          }

          loadConversations(data.expert.id);
          // Auto-connect immediately with OpenAI
          await startOpenAIChatSession(data.expert.id);
          setIsLoadingExpert(false);
        } else {
          setLoadError(true);
          setIsLoadingExpert(false);
        }
      } catch (error) {
        console.error("Failed to load expert:", error);
        setLoadError(true);
        setIsLoadingExpert(false);
      }
    };
    loadExpert();
  }, [slug, isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reload conversations when user authentication changes
  useEffect(() => {
    if (expert) {
      loadConversations(expert.id);
      
      // Check if current user is the expert owner
      if (user && expert && String(expert.user_id) === String(user.id)) {
        setIsExpertOwner(true);
        console.log("🎯 Expert owner detected on auth change:", user.id, "owns expert", expert.id);
      } else {
        setIsExpertOwner(false);
      }
    }
  }, [isAuthenticated, user, expert]);

  // Restore last active conversation on page load (only for current session)
  useEffect(() => {
    if (
      expert &&
      isAuthenticated &&
      conversations.length > 0 &&
      !currentConvId
    ) {
      const savedConvId = sessionStorage.getItem(
        `last_conversation_${expert.id}`,
      );
      if (savedConvId) {
        const savedConv = conversations.find((c) => c.id === savedConvId);
        if (savedConv) {
          setIsLoadingConversation(true);
          loadConversation(savedConv).finally(() => {
            setIsLoadingConversation(false);
          });
        }
      }
    }
  }, [expert, isAuthenticated, conversations]);
  // Auto-send question from URL parameter
  useEffect(() => {
    const question = searchParams.get("q");
    if (question && sessionId && isConnected && messages.length === 0) {
      // Set the question in input and auto-send
      setInputText(question);
      // Wait a bit for state to update, then send
      setTimeout(() => {
        sendMsg();
      }, 500);
    }
  }, [sessionId, isConnected, searchParams]);

  // Initialize Speech Recognition
  useEffect(() => {
    console.log("🎤 Initializing speech recognition...");
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        console.log("✅ Speech recognition API found");
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          console.log("🎤 Recognition started");
          setIsListening(true);
          isListeningRef.current = true;
        };

        recognition.onresult = (event: any) => {
          console.log("🎤 Recognition result received");

          // Ignore results if we just sent a message
          if (shouldIgnoreRecognitionRef.current) {
            console.log(
              "🎤 Ignoring recognition result (message was just sent)",
            );
            return;
          }

          let interimTranscript = "";
          let finalTranscript = "";

          // Process all results to get both final and interim text
          for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          // Combine final and interim for real-time display
          const completeTranscript = finalTranscript + interimTranscript;

          if (completeTranscript.trim()) {
            setInputText(completeTranscript.trim());
            // Auto-resize textarea after speech input
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
                textareaRef.current.style.height =
                  Math.min(textareaRef.current.scrollHeight, 128) + "px";
              }
            }, 0);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          isListeningRef.current = false;
        };

        recognition.onend = () => {
          // Only stop if user manually stopped it
          // If it stopped automatically, restart it
          console.log(
            "Recognition ended, isListeningRef:",
            isListeningRef.current,
          );
          if (isListeningRef.current) {
            console.log("Auto-restarting recognition...");
            try {
              recognition.start();
            } catch (error) {
              console.log("Recognition restart failed:", error);
              setIsListening(false);
              isListeningRef.current = false;
            }
          } else {
            console.log("User stopped recognition");
            setIsListening(false);
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Cleanup audio cache on component unmount
  useEffect(() => {
    return () => {
      // Revoke all cached audio URLs to prevent memory leaks
      audioCache.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      
      // Stop any currently playing audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, []);

  const toggleListening = () => {
    console.log("🎤 Toggle listening clicked", {
      hasRecognition: !!recognitionRef.current,
      speechSupported,
      isListening,
    });

    if (!speechSupported) {
      alert(
        "Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.",
      );
      return;
    }

    if (recognitionRef.current && speechSupported) {
      if (isListening) {
        // User manually stopping - set ref first so onend doesn't restart
        console.log("🛑 User manually stopping recognition");
        isListeningRef.current = false;
        setIsListening(false);
        recognitionRef.current.stop();
      } else {
        // User starting - set state and start recognition
        console.log("▶️ User starting recognition");
        isListeningRef.current = true;
        setIsListening(true);
        try {
          recognitionRef.current.start();
          console.log("✅ Recognition started successfully");
        } catch (error) {
          console.error("❌ Recognition start failed:", error);
          alert(`Failed to start voice recognition: ${error}`);
          setIsListening(false);
          isListeningRef.current = false;
        }
      }
    } else {
      console.error("❌ Recognition not available", {
        hasRecognition: !!recognitionRef.current,
        speechSupported,
      });
    }
  };

  const loadConversations = async (expertId: string) => {
    // Only load conversations if user is authenticated
    if (!isAuthenticated || !user) {
      console.log("❌ Cannot load conversations: Not authenticated");
      setConversations([]);
      return;
    }

    try {
      const token = localStorage.getItem("dilan_ai_token");
      console.log("📥 Loading conversations for expert:", expertId);
      console.log("🔑 Token present:", !!token);

      const response = await fetch(
        `${API_URL}/chat-sessions/?expert_id=${expertId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log("📡 Load conversations response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Loaded conversations:", data.length, "sessions");
        // Convert API response to frontend format
        setConversations(
          data.map((session: any) => ({
            id: session.id,
            title: session.title || "New Conversation",
            timestamp: new Date(session.updated_at),
            messages: [], // Messages loaded separately when conversation is opened
          })),
        );
      } else {
        const errorText = await response.text();
        console.error(
          "❌ Failed to load conversations:",
          response.status,
          errorText,
        );
      }
    } catch (error) {
      console.error("❌ Exception in loadConversations:", error);
    }
  };

  const generateSmartTitle = async (
    userMessage: string,
    agentResponse: string,
  ): Promise<string> => {
    try {
      // Use GPT to generate a concise title based on the conversation
      const response = await fetch(`${API_URL}/openai-chat/generate-title`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_message: userMessage,
          agent_response: agentResponse,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.title || "New Conversation";
      }
    } catch (error) {
      console.error("Failed to generate smart title:", error);
    }

    // Fallback to first 50 chars of user message
    return (
      userMessage.substring(0, 50) + (userMessage.length > 50 ? "..." : "")
    );
  };

  const updateConversationTitle = async (
    sessionId: string,
    newTitle: string,
  ) => {
    if (!isAuthenticated || !user) return;

    try {
      const token = localStorage.getItem("dilan_ai_token");
      const response = await fetch(
        `${API_URL}/chat-sessions/${sessionId}/title`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: newTitle }),
        },
      );

      if (response.ok) {
        // Update local state
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === sessionId ? { ...conv, title: newTitle } : conv,
          ),
        );
        console.log("✅ Title updated successfully");
      }
    } catch (error) {
      console.error("Failed to update title:", error);
    }
  };

  const saveConversation = async (title: string, firstMessage: ChatMessage) => {
    // Only save conversations if user is authenticated
    if (!isAuthenticated || !user || !expert) {
      console.log("❌ Cannot save: Not authenticated or missing user/expert", {
        isAuthenticated,
        user: !!user,
        expert: !!expert,
      });
      return null;
    }

    try {
      const token = localStorage.getItem("dilan_ai_token");
      console.log("💾 Saving conversation:", {
        title,
        user_id: user.id,
        expert_id: expert.id,
      });
      console.log("🔑 Token present:", !!token);

      // Create new session
      const sessionResponse = await fetch(`${API_URL}/chat-sessions/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          expert_id: expert.id,
          title: title,
        }),
      });

      console.log("📡 Session response status:", sessionResponse.status);

      if (sessionResponse.ok) {
        const session = await sessionResponse.json();
        console.log("✅ Session created:", session);

        // Save first message
        const messageResponse = await fetch(
          `${API_URL}/chat-sessions/${session.id}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              session_id: session.id,
              role: "user",
              content: firstMessage.text,
            }),
          },
        );

        console.log("📡 Message response status:", messageResponse.status);

        if (messageResponse.ok) {
          console.log("✅ First message saved");
        } else {
          const errorText = await messageResponse.text();
          console.error("❌ Failed to save first message:", errorText);
        }

        return session.id;
      } else {
        const errorText = await sessionResponse.text();
        console.error(
          "❌ Failed to create session:",
          sessionResponse.status,
          errorText,
        );
      }
    } catch (error) {
      console.error("❌ Exception in saveConversation:", error);
    }
    return null;
  };

  const saveMessage = async (
    sessionId: string,
    role: "user" | "assistant",
    content: string,
    files?: any[],
    citations?: any[],
    toolCalls?: any[],
  ) => {
    if (!isAuthenticated || !user) {
      console.log("❌ Cannot save message: Not authenticated");
      return;
    }

    try {
      const token = localStorage.getItem("dilan_ai_token");
      console.log("💾 Saving message:", {
        sessionId,
        role,
        contentLength: content.length,
        filesCount: files?.length || 0,
        citationsCount: citations?.length || 0,
        toolCallsCount: toolCalls?.length || 0,
        citationsData: citations,
        toolCallsData: toolCalls,
      });

      const response = await fetch(
        `${API_URL}/chat-sessions/${sessionId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            session_id: sessionId,
            role: role,
            content: content,
            files: files || null, // Include files if provided
            citations: citations || null, // Include citations if provided
            tool_calls: toolCalls || null, // Include tool_calls if provided
          }),
        },
      );

      if (response.ok) {
        console.log("✅ Message saved successfully");
      } else {
        const errorText = await response.text();
        console.error("❌ Failed to save message:", response.status, errorText);
      }
    } catch (error) {
      console.error("❌ Exception in saveMessage:", error);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    setConversations([]);
    setMessages([]);
    setCurrentConvId(null);
    // Clear saved conversation
    if (expert) {
      sessionStorage.removeItem(`last_conversation_${expert.id}`);
    }
  };

  const handleReadAloud = async (messageId: string, text: string) => {
    try {
      // Stop any currently playing audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setCurrentAudio(null);
        setPlayingMessageId(null);
      }

      // If clicking the same message that's playing, just stop
      if (playingMessageId === messageId) {
        return;
      }

      // Check if expert has a voice_id
      if (!expert?.voice_id) {
        alert("This expert doesn't have a voice configured for read-aloud.");
        return;
      }

      // For long text, use only first part for faster initial response
      let textToSpeak = text;
      if (text.length > 500) {
        // Find a good breaking point (sentence end) within first 500 chars
        const truncatePoint = text.substring(0, 500).lastIndexOf('. ');
        if (truncatePoint > 200) {
          textToSpeak = text.substring(0, truncatePoint + 1);
        } else {
          textToSpeak = text.substring(0, 500) + "...";
        }
      }

      // Check cache first
      const cacheKey = `${expert.voice_id}-${textToSpeak}`;
      let audioUrl = audioCache.get(cacheKey);

      if (!audioUrl) {
        setLoadingMessageId(messageId);

        // Call TTS API with optimized settings for speed
        const response = await fetch(`${API_URL}/tts/synthesize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: textToSpeak,
            voice_id: expert.voice_id,
            settings: {
              stability: 0.3,        // Lower for faster generation
              similarity_boost: 0.5, // Lower for faster generation
              style: 0.0,
              use_speaker_boost: false // Disable for faster generation
            }
          }),
        });

        if (!response.ok) {
          throw new Error(`TTS API error: ${response.status}`);
        }

        // Create audio from response
        const audioBlob = await response.blob();
        audioUrl = URL.createObjectURL(audioBlob);
        
        // Cache the audio URL (limit cache size to prevent memory issues)
        if (audioCache.size > 10) {
          const firstKey = audioCache.keys().next().value;
          if (firstKey) {
            const oldUrl = audioCache.get(firstKey);
            if (oldUrl) {
              URL.revokeObjectURL(oldUrl);
            }
            audioCache.delete(firstKey);
          }
        }
        audioCache.set(cacheKey, audioUrl);
        setAudioCache(new Map(audioCache));
      }
      const audio = new Audio(audioUrl);

      // Set up audio event listeners
      audio.onended = () => {
        setPlayingMessageId(null);
        setLoadingMessageId(null);
        setCurrentAudio(null);
        // Don't revoke URL here - keep it cached for reuse
      };

      audio.onerror = () => {
        setPlayingMessageId(null);
        setLoadingMessageId(null);
        setCurrentAudio(null);
        // Remove from cache on error and revoke URL
        audioCache.delete(cacheKey);
        URL.revokeObjectURL(audioUrl);
        alert("Failed to play audio. Please try again.");
      };

      // Play audio
      setCurrentAudio(audio);
      setLoadingMessageId(null);
      setPlayingMessageId(messageId);
      await audio.play();

    } catch (error) {
      console.error("Read-aloud error:", error);
      setPlayingMessageId(null);
      setLoadingMessageId(null);
      setCurrentAudio(null);
      alert("Failed to generate speech. Please try again.");
    }
  };

  const handleTranslate = async (messageId: string, text: string, targetLanguage: string) => {
    try {
      setTranslatingMessageId(messageId);

      // Call translation API
      const response = await fetch(`${API_URL}/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          target_language: targetLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Store the translation
        const newTranslations = new Map(translatedMessages);
        newTranslations.set(messageId, {
          text: data.translated_text,
          language: targetLanguage
        });
        setTranslatedMessages(newTranslations);
      } else {
        throw new Error(data.error || "Translation failed");
      }

    } catch (error) {
      console.error("Translation error:", error);
      alert("Failed to translate message. Please try again.");
    } finally {
      setTranslatingMessageId(null);
    }
  };

  const getLanguageOptions = () => [
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'tr', name: 'Turkish' },
    { code: 'pl', name: 'Polish' },
    { code: 'nl', name: 'Dutch' },
    { code: 'sv', name: 'Swedish' },
  ];

  const startOpenAIChatSession = async (expertId?: string) => {
    const id = expertId || expert?.id;
    if (!id) return;

    try {
      setIsConnecting(true);
      setMessages([]);
      setCurrentConvId(null);

      // Clear saved conversation when starting new chat
      if (expert) {
        sessionStorage.removeItem(`last_conversation_${expert.id}`);
      }

      const response = await fetch(`${API_URL}/openai-chat/session/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expert_id: id }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create session");
      }

      setSessionId(data.session_id);
      setIsConnected(true);
      setIsConnecting(false);

      console.log("✅ OpenAI chat session created:", data.session_id);
    } catch (error: any) {
      console.error("Error creating OpenAI session:", error);
      setIsConnecting(false);
    }
  };

  const endChatSession = async () => {
    if (!sessionId) return;

    try {
      await fetch(`${API_URL}/openai-chat/session/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch (error) {
      console.error("Error ending OpenAI session:", error);
    }

    setSessionId(null);
    setIsConnected(false);
    setIsConnecting(false);
    setIsWaitingForResponse(false);
  };

  const addMessage = (type: "user" | "agent", text: string) => {
    const msg: ChatMessage = {
      id: Date.now().toString(),
      type,
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Show uploading state
    setIsUploadingFiles(true);

    try {
      console.log("📤 Uploading files to S3...");

      // Upload all files to S3 in parallel
      const s3Files = await uploadFilesToS3(files);

      console.log("✅ Files uploaded to S3:", s3Files);

      // Store S3 file metadata (not the File objects)
      setUploadedFiles((prev) => [...prev, ...files]);

      // Store S3 URLs separately for sending to backend
      const s3FileData = s3Files.map((f) => ({
        name: f.name,
        type: f.type,
        url: f.url,
        s3_key: f.s3_key,
        size: f.size,
      }));

      // Append to existing S3 files (not replace) to support multiple uploads
      const existingS3Files = (window as any).__s3UploadedFiles || [];
      console.log(
        `📊 Before append - Existing S3 files: ${existingS3Files.length}, New files: ${s3FileData.length}`,
      );
      (window as any).__s3UploadedFiles = [...existingS3Files, ...s3FileData];

      console.log(
        `✅ After append - Total files ready to send: ${(window as any).__s3UploadedFiles.length}`,
      );
      console.log(`📋 All S3 files:`, (window as any).__s3UploadedFiles);
    } catch (error) {
      console.error("❌ S3 upload failed:", error);
      alert("Failed to upload files. Please try again.");
    } finally {
      setIsUploadingFiles(false);
      // Reset file input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    // Also remove from S3 data
    const s3Data = (window as any).__s3UploadedFiles || [];
    (window as any).__s3UploadedFiles = s3Data.filter(
      (_: any, i: number) => i !== index,
    );
  };

  const sendMsg = async () => {
    if (
      (!inputText.trim() && uploadedFiles.length === 0) ||
      !sessionId ||
      !isConnected ||
      isWaitingForResponse
    )
      return;

    // Check if user can send messages using plan limitations
    if (isAuthenticated && !checkCanSendMessage()) {
      console.log("🚫 Message blocked - showing limit modal");
      setShowLimitReachedModal(true);
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      text: inputText.trim(),
      timestamp: new Date(),
      files: uploadedFiles.map((f) => ({
        name: f.name,
        type: f.type,
        url: URL.createObjectURL(f),
        size: f.size,
      })),
    };

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);
    setIsWaitingForResponse(true);
    const messageText = inputText.trim();
    const filesToSend = [...uploadedFiles];
    setInputText("");
    setUploadedFiles([]);

    // Stop voice recognition if active and prevent it from refilling input
    if (isListening && recognitionRef.current) {
      console.log("🛑 Stopping voice recognition after sending message");
      shouldIgnoreRecognitionRef.current = true; // Ignore any pending results
      isListeningRef.current = false;
      setIsListening(false);
      recognitionRef.current.stop();

      // Reset the ignore flag after a short delay
      setTimeout(() => {
        shouldIgnoreRecognitionRef.current = false;
      }, 500);
    }

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      // Create streaming agent message placeholder FIRST (no latency)
      const agentMessageId = `agent-${Date.now()}`;
      const agentMessage: ChatMessage = {
        id: agentMessageId,
        type: "agent",
        text: "Thinking...", // Show "Thinking..." until first content arrives
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, agentMessage]);
      setStreamingMessageId(agentMessageId);
      setIsWaitingForResponse(false);

      // Prepare request - use S3 URLs if files are present
      let response: Response;
      let s3FileData: any[] = [];

      if (filesToSend.length > 0) {
        // Get S3 file data that was uploaded earlier
        s3FileData = (window as any).__s3UploadedFiles || [];

        console.log(`📎 Sending message with ${s3FileData.length} S3 file(s)`);
        console.log("📎 S3 file URLs:", s3FileData);

        response = await fetch(
          `${API_URL}/openai-chat/message/stream-with-files`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              session_id: sessionId,
              message: messageText,
              model: "gpt-4o-mini",
              files: s3FileData, // Send S3 URLs, not files
            }),
          },
        );

        // Don't clear S3 data yet - we need it for saving to database
      } else {
        response = await fetch(`${API_URL}/openai-chat/message/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionId,
            message: messageText,
            model: "gpt-4o-mini",
          }),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ HTTP Error:", response.status, errorText);
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      console.log("📡 Starting to process streaming response...");

      // Process streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      const decoder = new TextDecoder();
      let fullResponse = "";
      let toolCalls: any[] = [];
      let sources: any[] = [];
      let buffer = ""; // Buffer for incomplete lines
      let firstContentReceived = false; // Track if we've received first content

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log("✅ Stream reading completed");
            break;
          }

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Split by newlines
          const lines = buffer.split("\n");

          // Keep the last incomplete line in buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue; // Skip empty lines

            if (line.startsWith("data: ")) {
              try {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr) continue;

                const data = JSON.parse(jsonStr);
                console.log("📦 Received event:", data.type);

                if (data.type === "content") {
                  fullResponse += data.data;
                  console.log("data.data", data.data);

                  // Clear "Thinking..." on first content
                  if (!firstContentReceived) {
                    firstContentReceived = true;
                    fullResponse = data.data; // Start fresh, removing "Thinking..."
                  }

                  // Update message with streaming content
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === agentMessageId
                        ? { ...msg, text: fullResponse }
                        : msg,
                    ),
                  );
                } else if (data.type === "sources") {
                  console.log("📚 Received sources:", data.data.length);
                  sources = data.data;
                } else if (data.type === "tool_calls") {
                  console.log("🔧 Received tool calls:", data.data);
                  toolCalls = data.data.tool_calls_made || data.data || [];
                  console.log("🔧 Tool calls updated:", toolCalls);
                } else if (data.type === "done") {
                  console.log("✅ Received done event", data.data);
                  console.log("📊 Done event breakdown:", {
                    tool_calls_made: data.data.tool_calls_made,
                    sources: data.data.sources,
                    full_response: data.data.full_response
                      ? data.data.full_response.substring(0, 100) + "..."
                      : "none",
                  });

                  // Capture tool_calls_made and sources from the done event
                  const doneToolCalls = data.data.tool_calls_made || [];
                  const doneSources = data.data.sources || [];

                  console.log("🔍 Extracted from done event:", {
                    doneToolCalls: doneToolCalls,
                    doneSources: doneSources,
                  });

                  // Update the variables that will be used for saving
                  toolCalls =
                    doneToolCalls.length > 0 ? doneToolCalls : toolCalls;
                  sources = doneSources.length > 0 ? doneSources : sources;

                  console.log("🔍 Final streaming state:", {
                    fullResponse: fullResponse.length,
                    toolCalls: toolCalls.length,
                    sources: sources.length,
                    toolCallsData: toolCalls,
                    sourcesData: sources,
                  });
                  // Final update with complete data
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === agentMessageId
                        ? {
                            ...msg,
                            text: fullResponse,
                            toolCalls,
                            sources,
                            isStreaming: false,
                          }
                        : msg,
                    ),
                  );
                  setStreamingMessageId(null);
                } else if (data.type === "error") {
                  console.error("❌ Received error event:", data.data);
                  throw new Error(data.data.message || "Streaming error");
                }
              } catch (e) {
                console.error("❌ Error parsing SSE line:", line, e);
              }
            }
          }
        }
      } catch (streamError) {
        console.error("❌ Stream reading error:", streamError);
        throw streamError;
      }

      // NOW save to database AFTER streaming completes (no latency impact)
      console.log("✅ Streaming complete! Now saving to database...");

      // Refresh usage ribbon for expert owners
      if (isExpertOwner) {
        setUsageRefreshTrigger(prev => prev + 1);
        console.log("🔄 Triggering usage ribbon refresh for expert owner");
      }

      // Track message usage for authenticated users
      if (isAuthenticated && expert?.id) {
        try {
          await trackUsage({
            expert_id: expert.id,
            event_type: "message_sent",
            quantity: 1,
          });
          console.log("📊 Message usage tracked successfully");
        } catch (err) {
          console.error("❌ Failed to track message usage:", err);
        }
      }

      // Save conversation and messages to database
      let conversationId = currentConvId;

      if (messages.length === 0 && !currentConvId) {
        // First message - create new conversation (this also saves the user message)
        console.log("💾 Creating new conversation after streaming");
        const tempTitle = "New Conversation";
        const newSessionId = await saveConversation(tempTitle, userMessage);
        if (newSessionId) {
          console.log("✅ Conversation created with ID:", newSessionId);
          conversationId = newSessionId;
          setCurrentConvId(newSessionId);
          // Reload conversations to show the new one
          loadConversations(expert.id).catch((err) =>
            console.error("Failed to reload conversations:", err),
          );
        } else {
          console.log(
            "❌ Failed to create conversation (user may not be authenticated)",
          );
        }
      } else if (currentConvId) {
        // Existing conversation - save user message with files FIRST (await to ensure proper ordering)
        console.log(
          "💾 Saving user message to existing conversation:",
          currentConvId,
        );
        try {
          await saveMessage(
            currentConvId,
            "user",
            messageText,
            s3FileData.length > 0 ? s3FileData : undefined,
            undefined, // no citations for user messages
            undefined, // no tool_calls for user messages
          );
          console.log("✅ User message saved successfully");
        } catch (err) {
          console.error("❌ Failed to save user message:", err);
        }
      }

      // Clear S3 data after saving to database
      if (s3FileData.length > 0) {
        (window as any).__s3UploadedFiles = [];
      }

      // Save agent response to database AFTER user message (await to ensure proper ordering)
      if (conversationId && fullResponse) {
        // Small delay to ensure timestamp ordering in database
        await new Promise((resolve) => setTimeout(resolve, 100));

        console.log(
          "💾 Saving agent response to conversation:",
          conversationId,
        );
        console.log("🔍 Data being saved:", {
          fullResponse: fullResponse.length,
          sources: sources?.length || 0,
          toolCalls: toolCalls?.length || 0,
          sourcesData: sources,
          toolCallsData: toolCalls,
        });
        try {
          await saveMessage(
            conversationId,
            "assistant",
            fullResponse,
            undefined, // no files for assistant response
            sources, // include citations/sources
            toolCalls, // include tool_calls
          );
          console.log("✅ Agent message saved successfully");
        } catch (err) {
          console.error("❌ Failed to save agent message:", err);
        }

        // Generate and update smart title for first exchange
        if (messages.length === 0) {
          console.log("🏷️ Generating smart title for first exchange");
          generateSmartTitle(messageText, fullResponse)
            .then((smartTitle) => {
              console.log("✅ Smart title generated:", smartTitle);
              updateConversationTitle(conversationId!, smartTitle);
            })
            .catch((err) => console.error("Failed to generate title:", err));
        }

        // Update title if knowledge base was searched
        if (toolCalls && toolCalls.length > 0) {
          console.log("🔍 Knowledge base was searched, updating title");
          generateSmartTitle(messageText, fullResponse)
            .then((smartTitle) => {
              updateConversationTitle(conversationId!, smartTitle);
            })
            .catch((err) => console.error("Failed to update title:", err));
        }
      } else {
        console.log("⚠️ No conversation ID - messages not saved to DB");
      }
    } catch (error: any) {
      console.error("Error sending OpenAI message:", error);
      setIsWaitingForResponse(false);
      setStreamingMessageId(null);
      // Show error message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessageId
            ? {
                ...msg,
                text: "Sorry, I encountered an error. Please try again.",
                isStreaming: false,
              }
            : msg,
        ),
      );
    }
  };

  const loadConversation = async (conv: Conversation) => {
    if (!isAuthenticated || !user) return;

    try {
      // Set current conversation immediately for instant highlight

      // Clear old messages immediately
      setMessages([]);
      setCurrentConvId(conv.id);

      // Show loading state
      setIsLoadingConversation(true);

      const token = localStorage.getItem("dilan_ai_token");
      const response = await fetch(
        `${API_URL}/chat-sessions/${conv.id}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const messagesData = await response.json();
        // Convert API messages to frontend format
        const loadedMessages: ChatMessage[] = messagesData.map((msg: any) => ({
          id: msg.id,
          type: msg.role === "user" ? "user" : "agent",
          text: msg.content,
          timestamp: new Date(msg.created_at),
          files: msg.files
            ? msg.files.map((file: any) => ({
                ...file,
                url: convertS3UrlToProxy(file.url), // Convert S3 URLs to proxy URLs
              }))
            : undefined,
          sources: msg.citations || [], // Load citations as sources
          toolCalls: msg.tool_calls || [], // Load tool_calls
        }));

        // Sort messages by timestamp to ensure correct chronological order
        loadedMessages.sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        );

        setMessages(loadedMessages);

        // CRITICAL FIX: Restore conversation context to OpenAI session
        if (sessionId && loadedMessages.length > 0) {
          console.log("🔄 Restoring conversation context to OpenAI session...");
          try {
            await fetch(`${API_URL}/openai-chat/session/restore-context`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                session_id: sessionId,
                messages: loadedMessages.map(msg => ({
                  role: msg.type === "user" ? "user" : "assistant",
                  content: msg.text
                }))
              }),
            });
            console.log("✅ Conversation context restored");
          } catch (error) {
            console.error("❌ Failed to restore conversation context:", error);
          }
        }

        // Save to sessionStorage for persistence during current session only
        if (expert) {
          sessionStorage.setItem(`last_conversation_${expert.id}`, conv.id);
        }
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
    } finally {
      // Hide loading state
      setIsLoadingConversation(false);
    }
  };

  const groupConversations = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7days = new Date(today);
    last7days.setDate(last7days.getDate() - 7);

    return {
      today: conversations.filter((c) => c.timestamp >= today),
      yesterday: conversations.filter(
        (c) => c.timestamp >= yesterday && c.timestamp < today,
      ),
      last7days: conversations.filter(
        (c) => c.timestamp >= last7days && c.timestamp < yesterday,
      ),
      older: conversations.filter((c) => c.timestamp < last7days),
    };
  };

  const grouped = groupConversations();

  // Apply theme colors
  const primaryColor = publication?.primary_color || "#3B82F6";
  const secondaryColor = publication?.secondary_color || "#1E40AF";

  // Redirect to login if not authenticated (expert testing requires auth)
  if (!isLoadingExpert && !isAuthenticated) {
    router.push(`/persona/login?redirect=/persona/${slug}/chat`);
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Show loading screen while loading expert or connecting
  if (isLoadingExpert || (isConnecting && !isConnected)) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {isLoadingExpert
              ? "Loading expert..."
              : `Connecting to ${expert?.name || "expert"}...`}
          </h2>
          <p className="text-gray-500">
            Please wait while we establish the connection
          </p>
        </div>
      </div>
    );
  }

  // Show error screen if failed to load
  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Failed to load expert
          </h2>
          <p className="text-gray-500 mb-4">
            The expert could not be found or is not published
          </p>
          <Button
            onClick={() => router.push(`/project/${slug}/chat`)}
            className="bg-gray-900 hover:bg-gray-800"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Conversation History */}
      <div
        className={`
        fixed lg:relative inset-y-0 left-0 z-50
        w-64 bg-gray-900 text-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <div className="p-3 border-b border-gray-700">
          <Button
            onClick={() => startOpenAIChatSession()}
            className="w-full text-white border"
            style={{
              backgroundColor: "transparent",
              borderColor: primaryColor,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = primaryColor)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            New Conversation
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {!isAuthenticated ? (
            <div className="text-center p-4 text-gray-400 text-sm">
              <LogIn className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="mb-2">Login to save your chat history</p>
              <Button
                onClick={() => router.push("/auth/login")}
                size="sm"
                className="w-full"
                style={{ backgroundColor: primaryColor }}
              >
                Login / Sign Up
              </Button>
            </div>
          ) : (
            <>
              {grouped.today.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-2 px-2">
                    Today's Conversations
                  </div>
                  {grouped.today.map((c) => (
                    <div
                      key={c.id}
                      className={`p-2 rounded hover:bg-gray-800 flex items-center gap-2 group min-w-0 ${currentConvId === c.id ? "" : ""}`}
                      style={
                        currentConvId === c.id
                          ? { backgroundColor: primaryColor + "40" }
                          : {}
                      }
                    >
                      <MessageSquare className="h-4 w-4 flex-shrink-0" />
                      {editingTitleId === c.id ? (
                        <input
                          type="text"
                          value={editingTitleText}
                          onChange={(e) => setEditingTitleText(e.target.value)}
                          onBlur={() => {
                            if (editingTitleText.trim()) {
                              updateConversationTitle(
                                c.id,
                                editingTitleText.trim(),
                              );
                            }
                            setEditingTitleId(null);
                          }}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              if (editingTitleText.trim()) {
                                updateConversationTitle(
                                  c.id,
                                  editingTitleText.trim(),
                                );
                              }
                              setEditingTitleId(null);
                            }
                          }}
                          className="flex-1 min-w-0 bg-gray-700 text-white text-sm px-2 py-1 rounded outline-none focus:ring-1 focus:ring-gray-500"
                          autoFocus
                        />
                      ) : (
                        <>
                          <span
                            onClick={() => loadConversation(c)}
                            className="text-sm truncate flex-1 cursor-pointer"
                          >
                            {c.title}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTitleId(c.id);
                              setEditingTitleText(c.title);
                            }}
                            className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-gray-700 rounded"
                            aria-label="Edit conversation title"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {grouped.yesterday.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-2 px-2">
                    Yesterday
                  </div>
                  {grouped.yesterday.map((c) => (
                    <div
                      key={c.id}
                      className={`p-2 rounded hover:bg-gray-800 flex items-center gap-2 group min-w-0 ${currentConvId === c.id ? "" : ""}`}
                      style={
                        currentConvId === c.id
                          ? { backgroundColor: primaryColor + "40" }
                          : {}
                      }
                    >
                      <MessageSquare className="h-4 w-4 flex-shrink-0" />
                      {editingTitleId === c.id ? (
                        <input
                          type="text"
                          value={editingTitleText}
                          onChange={(e) => setEditingTitleText(e.target.value)}
                          onBlur={() => {
                            if (editingTitleText.trim()) {
                              updateConversationTitle(
                                c.id,
                                editingTitleText.trim(),
                              );
                            }
                            setEditingTitleId(null);
                          }}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              if (editingTitleText.trim()) {
                                updateConversationTitle(
                                  c.id,
                                  editingTitleText.trim(),
                                );
                              }
                              setEditingTitleId(null);
                            }
                          }}
                          className="flex-1 min-w-0 bg-gray-700 text-white text-sm px-2 py-1 rounded outline-none focus:ring-1 focus:ring-gray-500"
                          autoFocus
                        />
                      ) : (
                        <>
                          <span
                            onClick={() => loadConversation(c)}
                            className="text-sm truncate flex-1 cursor-pointer"
                          >
                            {c.title}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTitleId(c.id);
                              setEditingTitleText(c.title);
                            }}
                            className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-gray-700 rounded"
                            aria-label="Edit conversation title"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {grouped.last7days.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-2 px-2">
                    Last 7 Days
                  </div>
                  {grouped.last7days.map((c) => (
                    <div
                      key={c.id}
                      className={`p-2 rounded hover:bg-gray-800 flex items-center gap-2 group min-w-0 ${currentConvId === c.id ? "" : ""}`}
                      style={
                        currentConvId === c.id
                          ? { backgroundColor: primaryColor + "40" }
                          : {}
                      }
                    >
                      <MessageSquare className="h-4 w-4 flex-shrink-0" />
                      {editingTitleId === c.id ? (
                        <input
                          type="text"
                          value={editingTitleText}
                          onChange={(e) => setEditingTitleText(e.target.value)}
                          onBlur={() => {
                            if (editingTitleText.trim()) {
                              updateConversationTitle(
                                c.id,
                                editingTitleText.trim(),
                              );
                            }
                            setEditingTitleId(null);
                          }}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              if (editingTitleText.trim()) {
                                updateConversationTitle(
                                  c.id,
                                  editingTitleText.trim(),
                                );
                              }
                              setEditingTitleId(null);
                            }
                          }}
                          className="flex-1 min-w-0 bg-gray-700 text-white text-sm px-2 py-1 rounded outline-none focus:ring-1 focus:ring-gray-500"
                          autoFocus
                        />
                      ) : (
                        <>
                          <span
                            onClick={() => loadConversation(c)}
                            className="text-sm truncate flex-1 cursor-pointer"
                          >
                            {c.title}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTitleId(c.id);
                              setEditingTitleText(c.title);
                            }}
                            className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-gray-700 rounded"
                            aria-label="Edit conversation title"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {grouped.older.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-2 px-2">
                    Older
                  </div>
                  {grouped.older.map((c) => (
                    <div
                      key={c.id}
                      className={`p-2 rounded hover:bg-gray-800 flex items-center gap-2 group min-w-0 ${currentConvId === c.id ? "" : ""}`}
                      style={
                        currentConvId === c.id
                          ? { backgroundColor: primaryColor + "40" }
                          : {}
                      }
                    >
                      <MessageSquare className="h-4 w-4 flex-shrink-0" />
                      {editingTitleId === c.id ? (
                        <input
                          type="text"
                          value={editingTitleText}
                          onChange={(e) => setEditingTitleText(e.target.value)}
                          onBlur={() => {
                            if (editingTitleText.trim()) {
                              updateConversationTitle(
                                c.id,
                                editingTitleText.trim(),
                              );
                            }
                            setEditingTitleId(null);
                          }}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              if (editingTitleText.trim()) {
                                updateConversationTitle(
                                  c.id,
                                  editingTitleText.trim(),
                                );
                              }
                              setEditingTitleId(null);
                            }
                          }}
                          className="flex-1 min-w-0 bg-gray-700 text-white text-sm px-2 py-1 rounded outline-none focus:ring-1 focus:ring-gray-500"
                          autoFocus
                        />
                      ) : (
                        <>
                          <span
                            onClick={() => loadConversation(c)}
                            className="text-sm truncate flex-1 cursor-pointer"
                          >
                            {c.title}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTitleId(c.id);
                              setEditingTitleText(c.title);
                            }}
                            className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-gray-700 rounded"
                            aria-label="Edit conversation title"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-3 border-t border-gray-700">
          <Button
            onClick={() => router.push(`/project/${expert?.id}/chat`)}
            variant="ghost"
            className="w-full text-white hover:bg-gray-800 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {/* Header */}
        <div className="border-b bg-white px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between relative overflow-visible">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 mr-2"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>

          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            {expert?.avatar_url ? (
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                {expertImageLoading && (
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b border-blue-600"></div>
                  </div>
                )}
                <img
                  src={expert.avatar_url}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover transition-opacity duration-300 ${
                    expertImageLoading ? "opacity-0" : "opacity-100"
                  } ${expertImageError ? "hidden" : ""}`}
                  alt={expert.name}
                  onLoad={handleExpertImageLoad}
                  onError={handleExpertImageError}
                />
                {expertImageError && (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                {expert?.name}
              </h2>
              <p
                className="text-xs flex items-center"
                style={{ color: isConnected ? primaryColor : "#9CA3AF" }}
              >
                <span
                  className={`w-2 h-2 rounded-full mr-1.5 sm:mr-2 flex-shrink-0 ${isConnected ? "animate-pulse" : ""}`}
                  style={{
                    backgroundColor: isConnected ? primaryColor : "#9CA3AF",
                  }}
                ></span>
                <span className="truncate">
                  {isConnecting
                    ? "Connecting..."
                    : isConnected
                      ? "Connected"
                      : "Disconnected"}
                </span>
              </p>
            </div>
          </div>

          {/* User Profile / Login */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            {/* Call Button */}
            <Button
              onClick={() => router.push(`/persona/${slug}/call`)}
              size="sm"
              className="hidden sm:flex items-center justify-center w-9 h-9 text-white border-0 shadow-sm mr-2 rounded-full"
              style={{ backgroundColor: primaryColor }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              <Phone className="h-4 w-4" />
            </Button>

            {/* Mobile Call Button */}
            <Button
              onClick={() => router.push(`/persona/${slug}/call`)}
              size="sm"
              className="sm:hidden flex items-center justify-center w-9 h-9 text-white border-0 shadow-sm mr-2 rounded-full"
              style={{ backgroundColor: primaryColor }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              <Phone className="h-4 w-4" />
            </Button>
            {isAuthenticated && user ? (
              <>
                {/* Desktop View */}
                <div className="hidden md:flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                      {user.full_name || user.username}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-[120px]">
                      {user.email}
                    </p>
                  </div>
                  {user.avatar_url ? (
                    <div className="relative w-10 h-10 flex-shrink-0">
                      {userImageLoading && (
                        <div className="absolute inset-0 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-200">
                          <div className="animate-spin rounded-full h-4 w-4 border-b border-blue-600"></div>
                        </div>
                      )}
                      <img
                        src={
                          user.avatar_url.startsWith("http")
                            ? user.avatar_url
                            : `${API_URL}${user.avatar_url}`
                        }
                        className={`w-10 h-10 rounded-full object-cover border-2 border-gray-200 transition-opacity duration-300 ${
                          userImageLoading ? "opacity-0" : "opacity-100"
                        } ${userImageError ? "hidden" : ""}`}
                        alt={user.username}
                        onLoad={handleUserImageLoad}
                        onError={handleUserImageError}
                      />
                      {userImageError && (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-200">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                  )}
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>

                {/* Mobile/Tablet Dropdown */}
                <div
                  //  ref={userMenuRef}

                  className="relative"
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      ref={userMenuTriggerRef}
                      className="md:hidden flex items-center justify-center"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setDropdownPosition({
                          top: rect.bottom + 8,
                          right: window.innerWidth - rect.right,
                        });
                        setIsUserMenuOpen(!isUserMenuOpen);
                      }}
                      aria-label="User menu"
                    >
                      {user.avatar_url ? (
                        <div className="relative w-8 h-8">
                          {userImageLoading && (
                            <div className="absolute inset-0 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-200">
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                            </div>
                          )}
                          <img
                            src={user.avatar_url}
                            className={`w-8 h-8 rounded-full object-cover border-2 border-gray-200 transition-opacity duration-300 ${
                              userImageLoading ? "opacity-0" : "opacity-100"
                            } ${userImageError ? "hidden" : ""}`}
                            alt={user.username}
                            onLoad={handleUserImageLoad}
                            onError={handleUserImageError}
                          />
                          {userImageError && (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-200">
                              <User className="h-4 w-4 text-gray-500" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                      )}
                    </DropdownMenuTrigger>
                    {isUserMenuOpen && (
                      <div
                        className="fixed z-[100] w-56 overflow-hidden rounded-lg border border-gray-200 bg-white p-1 shadow-lg md:hidden"
                        style={{
                          top: `${dropdownPosition.top}px`,
                          right: `${dropdownPosition.right}px`,
                        }}
                      >
                        <div className="px-2 py-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.full_name || user.username}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user.email}
                          </p>
                        </div>
                        <div className="-mx-1 my-1 h-px bg-gray-200" />
                        <div
                          onClick={() => {
                            handleLogout();
                            setIsUserMenuOpen(false);
                          }}
                          className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Logout</span>
                        </div>
                      </div>
                    )}
                  </DropdownMenu>
                </div>
              </>
            ) : (
              <Button
                onClick={() => router.push("/auth/login")}
                size="sm"
                className="text-xs sm:text-sm"
                style={{ backgroundColor: primaryColor }}
              >
                <LogIn className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span>Login</span>
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 relative">
          {/* Usage Status Bar - only show for authenticated users with plan limitations */}
          {isAuthenticated && currentPlan && !limitStatus.isUnlimited && (
            <div className=" top-0 z-10 bg-gray-50 border border-gray-200">
              <UsageStatusBar
                limitStatus={limitStatus}
                currentPlan={currentPlan}
                loading={planLoading}
                compact={true}
                expertSlug={slug}
              />
            </div>
          )}
          
          <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">

            {/* Initial greeting when no messages */}
            {messages.length === 0 && !isWaitingForResponse && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                {expert?.avatar_url ? (
                  <div className="relative h-16 w-16">
                    {expertImageLoading && (
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                    <img
                      src={expert.avatar_url}
                      alt={expert.name}
                      className={`h-16 w-16 rounded-full object-cover transition-opacity duration-300 ${
                        expertImageLoading ? "opacity-0" : "opacity-100"
                      } ${expertImageError ? "hidden" : ""}`}
                      onLoad={handleExpertImageLoad}
                      onError={handleExpertImageError}
                    />
                    {expertImageError && (
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                        <User className="h-8 w-8 text-blue-600" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                    <User className="h-8 w-8 text-blue-600" />
                  </div>
                )}
                <div>
                  <p className="text-gray-700 font-medium text-lg">
                    Ask me anything!
                  </p>
                  <p className="text-sm text-gray-500">
                    I'm ready to help with your questions.
                  
                  </p>
                </div>
              </div>
            )}

            {/* Loading conversation indicator */}
            {isLoadingConversation && (
              <div className="flex justify-center items-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="animate-spin rounded-full h-10 w-10 border-b-2"
                    style={{ borderColor: primaryColor }}
                  ></div>
                  <p className="text-sm text-gray-500 font-medium">
                    Loading conversation...
                  </p>
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`group ${m.type === "user" ? "py-1.5 sm:py-2" : "py-2 sm:py-4"}`}
              >
                <div
                  className={`flex items-start gap-2 sm:gap-3 ${m.type === "user" ? "flex-row-reverse" : ""}`}
                >
                  {/* Show avatar for agent messages */}
                  {m.type === "agent" && (
                    <>
                      {expert?.avatar_url ? (
                        <div className="relative h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                          {expertImageLoading && (
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-2 w-2 sm:h-3 sm:w-3 border-b border-blue-600"></div>
                            </div>
                          )}
                          <img
                            src={expert.avatar_url}
                            alt={expert.name}
                            className={`h-6 w-6 sm:h-8 sm:w-8 rounded-full object-cover transition-opacity duration-300 ${
                              expertImageLoading ? "opacity-0" : "opacity-100"
                            } ${expertImageError ? "hidden" : ""}`}
                            onLoad={handleExpertImageLoad}
                            onError={handleExpertImageError}
                          />
                          {expertImageError && (
                            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                              <User className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                          <User className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                        </div>
                      )}
                    </>
                  )}

                  <div
                    className={`${m.type === "user" ? "flex justify-end w-full" : "flex-1 min-w-0"}`}
                  >
                    <div
                      className={`${m.type === "user" ? "text-white inline-block px-3 py-2 max-w-[85%] sm:max-w-[80%]" : "bg-gray-100 text-gray-900 inline-block max-w-[90%] sm:max-w-[85%] px-3 py-2.5 sm:px-5 sm:py-3.5"}`}
                      style={
                        m.type === "user"
                          ? {
                              backgroundColor: primaryColor,
                              borderRadius: "1rem 1rem 0 1rem",
                            }
                          : {
                              borderRadius: "1rem 1rem 1rem 0",
                            }
                      }
                    >
                      {m.type === "user" ? (
                        <div>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {translatedMessages.has(m.id) ? translatedMessages.get(m.id)!.text : m.text}
                          </p>
                          {translatedMessages.has(m.id) && (
                            <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                              <Languages className="h-3 w-3" />
                              Translated to {getLanguageOptions().find(lang => lang.code === translatedMessages.get(m.id)!.language)?.name}
                              <button
                                onClick={() => {
                                  const newTranslations = new Map(translatedMessages);
                                  newTranslations.delete(m.id);
                                  setTranslatedMessages(newTranslations);
                                }}
                                className="ml-1 text-blue-600 hover:text-blue-800 underline"
                              >
                                Show original
                              </button>
                            </div>
                          )}
                          {m.files && m.files.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {m.files.map((file, idx) => (
                                <div key={idx}>
                                  {file.type.startsWith("image/") ? (
                                    // Display images like ChatGPT - simple and clean
                                    <img
                                      src={file.url}
                                      alt={file.name}
                                      className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
                                      onClick={() => {
                                        setPreviewFile(file);
                                        setPreviewFiles(m.files || []);
                                        setIsPreviewOpen(true);
                                      }}
                                      onError={(e) => {
                                        // Fallback to file icon if image fails to load
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const fallback = target.nextElementSibling as HTMLElement;
                                        if (fallback) fallback.style.display = 'flex';
                                      }}
                                    />
                                  ) : (
                                    // Non-image files as buttons
                                    <button
                                      onClick={() => {
                                        setPreviewFile(file);
                                        setPreviewFiles(m.files || []);
                                        setIsPreviewOpen(true);
                                      }}
                                      className="flex items-center gap-2 bg-white bg-opacity-20 rounded-lg px-3 py-2 hover:bg-white hover:bg-opacity-30 transition-colors cursor-pointer"
                                    >
                                      <FileIcon className="h-4 w-4" />
                                      <span className="text-xs">{file.name}</span>
                                    </button>
                                  )}
                                  {/* Fallback file button (hidden by default) */}
                                  {file.type.startsWith("image/") && (
                                    <button
                                      style={{ display: 'none' }}
                                      onClick={() => {
                                        setPreviewFile(file);
                                        setPreviewFiles(m.files || []);
                                        setIsPreviewOpen(true);
                                      }}
                                      className="flex items-center gap-2 bg-white bg-opacity-20 rounded-lg px-3 py-2 hover:bg-white hover:bg-opacity-30 transition-colors cursor-pointer"
                                    >
                                      <ImageIcon className="h-4 w-4" />
                                      <span className="text-xs">{file.name}</span>
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm sm:text-[15px] leading-relaxed prose prose-sm max-w-none prose-gray prose-headings:text-gray-900 prose-p:text-gray-900 prose-strong:text-gray-900 prose-li:text-gray-900 prose-ul:my-2 prose-li:my-0 prose-p:my-0">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {translatedMessages.has(m.id) ? translatedMessages.get(m.id)!.text : m.text}
                          </ReactMarkdown>
                          {translatedMessages.has(m.id) && (
                            <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                              <Languages className="h-3 w-3" />
                              Translated to {getLanguageOptions().find(lang => lang.code === translatedMessages.get(m.id)!.language)?.name}
                              <button
                                onClick={() => {
                                  const newTranslations = new Map(translatedMessages);
                                  newTranslations.delete(m.id);
                                  setTranslatedMessages(newTranslations);
                                }}
                                className="ml-1 text-blue-600 hover:text-blue-800 underline"
                              >
                                Show original
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Show tool calls if any (OpenAI knowledge base search) */}
                      {m.toolCalls && m.toolCalls.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-300">
                          <p className="text-xs text-gray-600 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            Searched knowledge base:{" "}
                            {m.toolCalls[0].results_count} results found
                          </p>
                        </div>
                      )}

                      {/* Show citations if sources were used */}
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-2">
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedCitations);
                              if (newExpanded.has(m.id)) {
                                newExpanded.delete(m.id);
                              } else {
                                newExpanded.add(m.id);
                              }
                              setExpandedCitations(newExpanded);
                            }}
                            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors py-1"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span className="font-medium">
                              Citations ({m.sources.length})
                            </span>
                            {expandedCitations.has(m.id) ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {expandedCitations.has(m.id) && (
                            <div className="mt-2 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                              <div className="divide-y divide-gray-100">
                                {m.sources.map((source, idx) => (
                                  <div
                                    key={idx}
                                    className="group p-3 hover:bg-gray-50 transition-colors"
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                      <div className="flex-1">
                                        <span className="text-xs font-medium text-gray-900">
                                          {source.source}
                                        </span>
                                        {source.page && (
                                          <span className="text-xs text-gray-500 ml-2">
                                            Page {source.page}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-xs text-gray-400">
                                        {Math.round(source.score * 100)}%
                                      </span>
                                    </div>
                                    {source.text && (
                                      <div className="text-xs text-gray-600 leading-relaxed mt-1.5 line-clamp-2">
                                        {source.text}...
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons - Below message like ChatGPT */}
                    {m.type === "agent" && (
                      <div className="flex items-center gap-2 mt-2 ml-1">
                        {/* Copy Button */}
                        <button
                          onClick={() => {
                            const textToCopy = translatedMessages.has(m.id) ? translatedMessages.get(m.id)!.text : m.text;
                            navigator.clipboard.writeText(textToCopy);
                            setCopiedMessageId(m.id);
                            setTimeout(() => setCopiedMessageId(null), 2000);
                          }}
                          className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors group"
                          title="Copy message"
                        >
                          {copiedMessageId === m.id ? (
                            <Check className="h-4 w-4 text-gray-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
                          )}
                        </button>

                        {/* Read Aloud Button */}
                        <button
                          onClick={() => {
                            const textToRead = translatedMessages.has(m.id) ? translatedMessages.get(m.id)!.text : m.text;
                            handleReadAloud(m.id, textToRead);
                          }}
                          className={`p-1.5 rounded-lg transition-all duration-200 group ${
                            playingMessageId === m.id 
                              ? "bg-blue-50 hover:bg-blue-100" 
                              : loadingMessageId === m.id
                                ? "bg-orange-50"
                                : "hover:bg-gray-200"
                          } ${!expert?.voice_id || loadingMessageId === m.id ? "opacity-50 cursor-not-allowed" : ""}`}
                          title={
                            !expert?.voice_id 
                              ? "Voice not available for this expert"
                              : loadingMessageId === m.id
                                ? "Generating speech..."
                                : playingMessageId === m.id 
                                  ? "Stop reading" 
                                  : "Read aloud"
                          }
                          disabled={!expert?.voice_id || loadingMessageId === m.id}
                        >
                          {loadingMessageId === m.id ? (
                            <div className="h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                          ) : playingMessageId === m.id ? (
                            <VolumeX className="h-4 w-4 text-blue-600 animate-pulse" />
                          ) : (
                            <Volume2 className={`h-4 w-4 transition-colors ${
                              expert?.voice_id 
                                ? "text-gray-500 group-hover:text-blue-600" 
                                : "text-gray-300"
                            }`} />
                          )}
                        </button>

                        {/* Translate Button */}
                        <div className="relative translate-dropdown-container">
                          <button
                            onClick={() => {
                              setOpenTranslateDropdown(openTranslateDropdown === m.id ? null : m.id);
                            }}
                            className={`p-1.5 rounded-lg transition-all duration-200 group ${
                              translatingMessageId === m.id
                                ? "bg-green-50"
                                : translatedMessages.has(m.id)
                                  ? "bg-green-50 hover:bg-green-100"
                                  : "hover:bg-gray-200"
                            } ${translatingMessageId === m.id ? "opacity-50 cursor-not-allowed" : ""}`}
                            title={
                              translatingMessageId === m.id
                                ? "Translating..."
                                : translatedMessages.has(m.id)
                                  ? "Translated - click to change language"
                                  : "Translate message"
                            }
                            disabled={translatingMessageId === m.id}
                          >
                            {translatingMessageId === m.id ? (
                              <div className="h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Languages className={`h-4 w-4 transition-colors ${
                                translatedMessages.has(m.id)
                                  ? "text-green-600"
                                  : "text-gray-500 group-hover:text-green-600"
                              }`} />
                            )}
                          </button>
                          
                          {/* Custom Dropdown */}
                          {openTranslateDropdown === m.id && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/30 shadow-2xl z-50 max-h-64 overflow-hidden ring-1 ring-black/5">
                              <div className="px-3 py-2 text-xs font-medium text-gray-700 bg-white/10 border-b border-white/20">
                                <Languages className="h-3 w-3 inline mr-1.5 opacity-50" />
                                Translate to:
                              </div>
                              <div className="py-1 max-h-48 overflow-y-auto">
                                {getLanguageOptions().map((language) => (
                                  <button
                                    key={language.code}
                                    onClick={() => {
                                      handleTranslate(m.id, m.text, language.code);
                                      setOpenTranslateDropdown(null); // Close dropdown after selection
                                    }}
                                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/20 hover:text-blue-700 transition-all duration-200 flex items-center group backdrop-blur-sm"
                                  >
                                    <Languages className="h-4 w-4 mr-2.5 text-gray-500 opacity-50 group-hover:text-blue-500 group-hover:opacity-80 transition-all" />
                                    <span className="font-normal text-gray-700">{language.name}</span>
                                  </button>
                                ))}
                                {translatedMessages.has(m.id) && (
                                  <>
                                    <div className="border-t border-white/20 my-1" />
                                    <button
                                      onClick={() => {
                                        const newTranslations = new Map(translatedMessages);
                                        newTranslations.delete(m.id);
                                        setTranslatedMessages(newTranslations);
                                        setOpenTranslateDropdown(null); // Close dropdown after action
                                      }}
                                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/20 hover:text-red-700 transition-all duration-200 flex items-center text-gray-600 group backdrop-blur-sm"
                                    >
                                      <X className="h-4 w-4 mr-2.5 text-gray-500 opacity-50 group-hover:text-red-500 group-hover:opacity-80 transition-all" />
                                      <span className="font-normal">Show original</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator - only show when waiting and not streaming */}
            {isWaitingForResponse && !streamingMessageId && (
              <div className="group py-2 sm:py-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  {expert?.avatar_url ? (
                    <div className="relative h-6 w-6 sm:h-8 sm:w-8">
                      {expertImageLoading && (
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-2 w-2 sm:h-3 sm:w-3 border-b border-blue-600"></div>
                        </div>
                      )}
                      <img
                        src={expert.avatar_url}
                        alt={expert.name}
                        className={`h-6 w-6 sm:h-8 sm:w-8 rounded-full object-cover transition-opacity duration-300 ${
                          expertImageLoading ? "opacity-0" : "opacity-100"
                        } ${expertImageError ? "hidden" : ""}`}
                        onLoad={handleExpertImageLoad}
                        onError={handleExpertImageError}
                      />
                      {expertImageError && (
                        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                          <User className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                      <User className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                    </div>
                  )}
                  <span className="text-sm text-gray-500">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t bg-gradient-to-b from-white to-gray-50 px-3 sm:px-6 py-3 sm:py-5">
          <div className="max-w-3xl mx-auto">
            {/* File Upload Loader */}
            {isUploadingFiles && (
              <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3 bg-blue-50 rounded-xl px-3 sm:px-4 py-2 sm:py-3 border border-blue-200 animate-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Uploading files...
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Please wait while we upload your files to the cloud
                  </p>
                </div>
              </div>
            )}

            {/* File Preview */}
            {uploadedFiles.length > 0 && (
              <div className="mb-3 sm:mb-4 flex flex-wrap gap-2 animate-in slide-in-from-bottom-2 duration-200">
                {uploadedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="group flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200"
                  >
                    {file.type.startsWith("image/") ? (
                      // Show image thumbnail
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="h-10 w-10 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            const fileAttachment: FileAttachment = {
                              name: file.name,
                              type: file.type,
                              url: URL.createObjectURL(file),
                              size: file.size,
                            };
                            setPreviewFile(fileAttachment);
                            setPreviewFiles([fileAttachment]);
                            setIsPreviewOpen(true);
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-700 block truncate">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(1)} MB
                          </span>
                        </div>
                      </div>
                    ) : (
                      // Show file icon for non-images
                      <button
                        onClick={() => {
                          const fileAttachment: FileAttachment = {
                            name: file.name,
                            type: file.type,
                            url: URL.createObjectURL(file),
                            size: file.size,
                          };
                          setPreviewFile(fileAttachment);
                          setPreviewFiles([fileAttachment]);
                          setIsPreviewOpen(true);
                        }}
                        className="flex items-center gap-2 flex-1 min-w-0 hover:bg-gray-50 rounded-lg p-1 transition-colors"
                      >
                        <div
                          className="p-1.5 rounded-lg"
                          style={{ backgroundColor: `${primaryColor}15` }}
                        >
                          <FileIcon
                            className="h-4 w-4"
                            style={{ color: primaryColor }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 max-w-[150px] truncate">
                          {file.name}
                        </span>
                      </button>
                    )}
                    <button
                      onClick={() => removeFile(idx)}
                      className="ml-1 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove file"
                      aria-label="Remove file"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Container */}
            <div className="relative">
              <div className="flex items-center gap-1 sm:gap-2 bg-white rounded-2xl border-2 border-gray-200 focus-within:border-gray-300 shadow-lg hover:shadow-xl transition-all duration-200 p-1.5 sm:p-2">
                {/* File Upload Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                  aria-label="Upload files"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  size="icon"
                  variant="ghost"
                  className="rounded-xl h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 hover:bg-gray-100 transition-colors"
                  title="Attach files"
                  disabled={
                    isWaitingForResponse ||
                    streamingMessageId !== null ||
                    isUploadingFiles
                  }
                >
                  {isUploadingFiles ? (
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-gray-400 border-t-transparent"></div>
                  ) : (
                    <Paperclip className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                  )}
                </Button>

                {/* Textarea */}
                <div className="flex-1 px-1 sm:px-2 flex items-center">
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      // Auto-resize textarea
                      if (textareaRef.current) {
                        textareaRef.current.style.height = "24px"; // Reset to single line
                        const newHeight = Math.min(
                          textareaRef.current.scrollHeight,
                          120,
                        );
                        textareaRef.current.style.height = newHeight + "px";
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (
                          !isWaitingForResponse &&
                          !streamingMessageId &&
                          (inputText.trim() || uploadedFiles.length > 0)
                        ) {
                          sendMsg();
                        }
                      }
                    }}
                    onPaste={async (e) => {
                      const items = Array.from(e.clipboardData?.items || []);
                      const imageItems = items.filter(item => item.type.startsWith('image/'));
                      
                      if (imageItems.length > 0) {
                        e.preventDefault();
                        setIsUploadingFiles(true);
                        
                        try {
                          const files: File[] = [];
                          for (const item of imageItems) {
                            const file = item.getAsFile();
                            if (file) {
                              files.push(file);
                            }
                          }
                          
                          if (files.length > 0) {
                            console.log("📋 Pasting", files.length, "image(s)");
                            
                            // Upload to S3
                            const s3Files = await uploadFilesToS3(files);
                            console.log("✅ Pasted images uploaded to S3:", s3Files);
                            
                            // Add to uploaded files
                            setUploadedFiles((prev) => [...prev, ...files]);
                            
                            // Store S3 URLs
                            const s3FileData = s3Files.map((f) => ({
                              name: f.name,
                              type: f.type,
                              url: f.url,
                              s3_key: f.s3_key,
                              size: f.size,
                            }));
                            
                            const existingS3Files = (window as any).__s3UploadedFiles || [];
                            (window as any).__s3UploadedFiles = [...existingS3Files, ...s3FileData];
                            
                            console.log("✅ Pasted images ready to send");
                          }
                        } catch (error) {
                          console.error("❌ Failed to paste images:", error);
                          alert("Failed to paste images. Please try again.");
                        } finally {
                          setIsUploadingFiles(false);
                        }
                      }
                    }}
                    placeholder={
                      isListening
                        ? "🎤 Listening... speak now"
                        : isUploadingFiles
                        ? "Uploading images..."
                        : "Type your message or paste images..."
                    }
                    className="w-full border-0 bg-transparent focus:outline-none resize-none overflow-y-auto text-sm sm:text-[15px] leading-6 text-gray-900 placeholder:text-gray-400"
                    style={{ height: "24px", maxHeight: "100px" }}
                    rows={1}
                    disabled={
                      isWaitingForResponse || streamingMessageId !== null
                    }
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                  {/* Speech Recognition Button */}
                  {speechSupported && (
                    <Button
                      onClick={toggleListening}
                      size="icon"
                      variant="ghost"
                      className={`rounded-xl h-8 w-8 sm:h-10 sm:w-10 transition-all duration-200 ${
                        isListening
                          ? "bg-red-50 text-red-600 hover:bg-red-100 animate-pulse"
                          : "hover:bg-gray-100 text-gray-500"
                      }`}
                      title={isListening ? "Stop listening" : "Voice input"}
                      disabled={
                        isWaitingForResponse || streamingMessageId !== null
                      }
                    >
                      {isListening ? (
                        <svg
                          className="h-4 w-4 sm:h-5 sm:w-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <rect x="6" y="4" width="4" height="16" rx="2" />
                          <rect x="14" y="4" width="4" height="16" rx="2" />
                        </svg>
                      ) : (
                        <svg
                          className="h-4 w-4 sm:h-5 sm:w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                          />
                        </svg>
                      )}
                    </Button>
                  )}

                  {/* Send Button */}
                  <Button
                    onClick={sendMsg}
                    disabled={
                      (!inputText.trim() && uploadedFiles.length === 0) ||
                      isWaitingForResponse ||
                      streamingMessageId !== null ||
                      planLoading
                    }
                    size="icon"
                    className="rounded-xl h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor:
                        (inputText.trim() || uploadedFiles.length > 0) &&
                        !isWaitingForResponse &&
                        !streamingMessageId &&
                        !planLoading
                          ? primaryColor
                          : "#E5E7EB",
                      color:
                        (inputText.trim() || uploadedFiles.length > 0) &&
                        !isWaitingForResponse &&
                        !streamingMessageId &&
                        !planLoading
                          ? "white"
                          : "#9CA3AF",
                    }}
                    onMouseEnter={(e) => {
                      if (
                        (inputText.trim() || uploadedFiles.length > 0) &&
                        !isWaitingForResponse &&
                        !streamingMessageId &&
                        !planLoading
                      ) {
                        e.currentTarget.style.backgroundColor = secondaryColor;
                        e.currentTarget.style.transform = "scale(1.05)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (
                        (inputText.trim() || uploadedFiles.length > 0) &&
                        !isWaitingForResponse &&
                        !streamingMessageId &&
                        !planLoading
                      ) {
                        e.currentTarget.style.backgroundColor = primaryColor;
                        e.currentTarget.style.transform = "scale(1)";
                      }
                    }}
                  >
                    <ArrowUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>
              </div>

              {/* Helper text */}
              <div className="mt-2 px-1 flex items-center justify-between text-xs text-gray-400">
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                  <span className="hidden sm:inline">
                    Press Enter to send, Shift+Enter for new line
                  </span>
                  <span className="sm:hidden text-[10px]">Enter to send</span>
                  <span className="text-[10px] sm:text-xs">
                    • Best experience with Chrome or Safari
                  </span>
                </div>
                {(isWaitingForResponse || streamingMessageId) && (
                  <span className="flex items-center gap-1 text-gray-500">
                    <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-pulse"></div>
                    Processing...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        files={previewFiles}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewFile(null);
          setPreviewFiles([]);
        }}
      />

      {/* Limit Reached Modal */}
      <LimitReachedModal
        isOpen={showLimitReachedModal}
        onClose={() => setShowLimitReachedModal(false)}
        limitStatus={limitStatus}
        currentPlan={currentPlan}
        expertSlug={slug}
        featureType="chat"
      />

      {/* Monthly Warning Modal */}
      <MonthlyWarningModal
        isOpen={monthlyWarningModal.isOpen}
        onClose={() => setMonthlyWarningModal(prev => ({ ...prev, isOpen: false }))}
        warningMessage={monthlyWarningModal.warningMessage}
        currentUsage={monthlyWarningModal.currentUsage}
        monthlyThreshold={monthlyWarningModal.monthlyThreshold}
        usageType={monthlyWarningModal.usageType}
        planName={monthlyWarningModal.planName}
        subscriptionMonths={monthlyWarningModal.subscriptionMonths}
      />
    </div>
  );
};

export default ExpertChatPage;
