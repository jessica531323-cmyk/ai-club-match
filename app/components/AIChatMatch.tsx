"use client";

import { useState, useRef, useEffect } from "react";
import {
  chatWithAI,
  generateFinalProfile,
  type Message,
  type UserProfileFromAI,
} from "../lib/volcengine";

interface AIChatMatchProps {
  onComplete: (profile: UserProfileFromAI) => void;
  onCancel: () => void;
}

export default function AIChatMatch({ onComplete, onCancel }: AIChatMatchProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "嗨！我是你的社团匹配助手 🤖\n\n想找到最适合你的社团，我想先了解你一下～\n\n平时没课的时候，你最喜欢做什么呢？",
    },
  ]);
  const [input, setInput] = useState("");
  const [currentRound, setCurrentRound] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<Partial<UserProfileFromAI>>({});
  const [isComplete, setIsComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // 调用AI
    const allMessages = [...messages, userMessage];
    const { reply, profileUpdate } = await chatWithAI(allMessages, currentRound);

    // 更新画像
    if (profileUpdate) {
      setProfile((prev) => ({ ...prev, ...profileUpdate }));
    }

    // 添加AI回复
    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

    // 检查是否完成10轮
    if (currentRound >= 10) {
      setIsComplete(true);
      const finalProfile = await generateFinalProfile([...allMessages, { role: "assistant", content: reply }]);
      onComplete(finalProfile);
    } else {
      setCurrentRound((prev) => prev + 1);
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 实时画像展示
  const ProfileBadge = ({ label, value }: { label: string; value?: string }) => {
    if (!value) return null;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 text-xs rounded-full">
        <span className="text-gray-400">{label}:</span>
        <span className="font-medium">{value}</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">
              🤖
            </div>
            <div>
              <h3 className="font-bold text-white">AI社团匹配助手</h3>
              <p className="text-white/70 text-xs">
                第 {currentRound}/10 轮对话
                {currentRound === 10 && " · 即将完成"}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all"
          >
            ✕
          </button>
        </div>

        {/* 进度条 */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
            style={{ width: `${(currentRound / 10) * 100}%` }}
          />
        </div>

        {/* 实时画像预览 */}
        {Object.keys(profile).length > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <p className="text-xs text-gray-400 mb-2">已了解的画像特征：</p>
            <div className="flex flex-wrap gap-1.5">
              <ProfileBadge label="兴趣" value={profile.interests?.[0]} />
              <ProfileBadge label="性格" value={profile.personality} />
              <ProfileBadge label="社交" value={profile.socialPreference} />
              <ProfileBadge label="规模" value={profile.preferredSize} />
              <ProfileBadge label="时间" value={profile.timeCommitment} />
              <ProfileBadge label="角色" value={profile.rolePreference} />
            </div>
          </div>
        )}

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
                <span className="text-xs text-gray-500">AI思考中...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isComplete ? "已完成对话" : "输入你的回复..."}
              disabled={isLoading || isComplete}
              className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || isComplete}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              发送
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            💡 按 Enter 快速发送 · 共10轮对话
          </p>
        </div>
      </div>
    </div>
  );
}
