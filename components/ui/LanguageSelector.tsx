"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Languages, ChevronDown } from "lucide-react";

interface Language {
  code: string;
  name: string;
  flag: string;
}

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  className?: string;
  buttonClassName?: string;
  compact?: boolean;
  disabled?: boolean;
}

const LANGUAGES: Language[] = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
  className = "",
  buttonClassName = "",
  compact = false,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLang = LANGUAGES.find((lang) => lang.code === selectedLanguage) || LANGUAGES[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageSelect = (languageCode: string) => {
    onLanguageChange(languageCode);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        className={`flex items-center justify-center gap-2 ${buttonClassName} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {compact ? (
          <>
            <Languages className="h-4 w-4" />
            <span className="hidden sm:inline">{selectedLang.flag}</span>
            <ChevronDown className="h-3 w-3" />
          </>
        ) : (
          <>
            <Languages className="h-4 w-4" />
            <span className="flex items-center gap-2">
              <span>{selectedLang.flag}</span>
              <span>{selectedLang.name}</span>
            </span>
            <ChevronDown className="h-4 w-4" />
          </>
        )}
      </Button>

      {isOpen && !disabled && (
        <div className="absolute z-[100] min-w-[12rem] max-h-64 overflow-y-auto overflow-hidden rounded-lg border border-gray-200 bg-white p-1 shadow-lg right-0 top-full mt-2 animate-in fade-in-80 slide-in-from-top-2 duration-200 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {LANGUAGES.map((language) => (
            <div
              key={language.code}
              onClick={() => handleLanguageSelect(language.code)}
              className={`relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100 ${selectedLanguage === language.code ? "bg-gray-50" : ""
                }`}
            >
              <span className="text-lg mr-3">{language.flag}</span>
              <span>{language.name}</span>
              {selectedLanguage === language.code && (
                <span className="ml-auto text-blue-600 font-medium">✓</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;