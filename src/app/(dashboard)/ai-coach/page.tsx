"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Send, Sparkles, Loader2, User as UserIcon, Bot, MessageSquare } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AiCoach() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I am your TradeSense AI Coach. I analyze your trading journal performance, win rates, and emotional triggers to help you refine your risk control and psychology. Ask me anything or select one of the prompts below!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    { text: "Why am I losing?", label: "Assess Losses" },
    { text: "Find mistakes in my trades", label: "Scan Mistakes" },
    { text: "Improve my trading psychology", label: "Mindset Advice" },
    { text: "Explain proper risk management", label: "Risk Control" },
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || !user) return;

    const newMessages = [...messages, { role: "user" as const, content: textToSend }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          messages: newMessages,
        }),
      });

      if (!response.ok) {
        throw new Error("Coach response error");
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I ran into an issue communicating with the AI server. Please make sure OpenAI keys are configured.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[82vh] justify-between space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          AI Performance Coach
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Consult our interactive coach to check errors, optimize risk, and audit execution psychology.
        </p>
      </div>

      {/* Main chat layout */}
      <div className="flex-1 glass-card rounded-2xl p-4 flex flex-col justify-between overflow-hidden border border-gray-800/80">
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide mb-4">
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div
                key={i}
                className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                  isUser ? "bg-blue-600 text-white" : "bg-gradient-to-tr from-blue-600 to-emerald-500 p-0.5"
                }`}>
                  {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4 text-white" />}
                </div>
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    isUser
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-[#0b1229]/60 text-gray-300 border border-gray-800/80 rounded-tl-none"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex gap-3 max-w-[80%]">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-emerald-500 p-0.5 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-[#0b1229]/60 border border-gray-800/80 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-1.5 text-xs text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span>Coach is thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Action input panel */}
        <div className="border-t border-gray-800/80 pt-4 space-y-3">
          {/* Quick prompts */}
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((p) => (
              <button
                key={p.text}
                onClick={() => handleSendMessage(p.text)}
                disabled={loading}
                className="px-3 py-1.5 bg-[#090f1d] hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white rounded-lg text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your trades, risk, or mindset..."
              disabled={loading}
              className="glass-input flex-grow text-xs"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
