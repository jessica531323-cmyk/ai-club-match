"use client";

import { useState } from "react";
import {
  allClubs,
  categoryConfig,
  type Club,
  type ClubCategory,
} from "./data/clubs";
import AIChatMatch from "./components/AIChatMatch";
import type { UserProfileFromAI } from "./lib/volcengine";

// ==================== 类型定义 ====================

type UserProfile = {
  interests: string[];
  personality: string;
  expression: string;
  time_commitment: string;
  goals: string[];
  activity_level: string;
  social_preference: string;
  role_preference: string;
  exploration_type: string;
  user_type: string;
  preferred_atmosphere: string;
  preferred_size: string;
};

type Recommendation = Club & { score: number; reason: string };

type PageView = "home" | "browse" | "detail" | "quiz" | "results" | "aiChat";

// ==================== AI对话转用户画像 ====================

function convertAIProfileToUserProfile(aiProfile: UserProfileFromAI): UserProfile {
  const roleMap: Record<string, string> = {
    '领导者': '组织者',
    '执行者': '核心成员',
    '创意者': '核心成员',
    '协调者': '组织者',
    '参与者': '参与者',
  };

  return {
    interests: aiProfile.interests,
    personality: aiProfile.personality === 'ambivert' ? '中等' : aiProfile.personality,
    expression: '可以接受',
    time_commitment: aiProfile.timeCommitment,
    goals: aiProfile.goals,
    activity_level: aiProfile.activityLevel,
    social_preference: aiProfile.socialPreference,
    role_preference: roleMap[aiProfile.rolePreference] || '参与者',
    exploration_type: aiProfile.explorationType,
    user_type: aiProfile.userType,
    preferred_atmosphere: aiProfile.activityLevel === '高' ? '高强度' : aiProfile.activityLevel === '低' ? '轻松' : '适中',
    preferred_size: aiProfile.preferredSize,
  };
}

// ==================== 问卷数据 ====================

const questions = [
  {
    id: 1,
    type: "multi",
    question: "Q1. 你对哪些领域感兴趣？（多选）",
    options: ["音乐", "表演", "摄影", "体育", "技术", "社交", "写作", "绘画", "研究", "公益"],
    icons: ["🎵", "🎭", "📷", "🏃", "💻", "🤝", "✍️", "🎨", "🔬", "❤️"],
  },
  {
    id: 2,
    type: "single",
    question: "Q2. 周末你通常怎么度过？",
    options: ["宅在宿舍", "运动", "参加活动", "学习"],
    icons: ["🏠", "🏃", "🎉", "📚"],
  },
  {
    id: 3,
    type: "single",
    question: "Q3. 你的性格倾向是？",
    options: ["外向", "中等", "内向"],
    icons: ["🌞", "⚖️", "🌙"],
  },
  {
    id: 4,
    type: "single",
    question: "Q4. 在社团中，你对于表达自己的想法？",
    options: ["喜欢表达", "可以接受", "尽量避免"],
    icons: ["🎤", "👌", "🤫"],
  },
  {
    id: 5,
    type: "single",
    question: "Q5. 你每周能投入多少时间？",
    options: ["<2h", "2-5h", "5-10h", ">10h"],
    icons: ["⏱️", "🕐", "🕒", "🕕"],
  },
  {
    id: 6,
    type: "multi",
    question: "Q6. 加入社团的主要目标是？（多选）",
    options: ["交朋友", "提升技能", "丰富简历", "探索兴趣", "放松", "社会实践"],
    icons: ["👥", "📈", "📄", "🔍", "😌", "🌍"],
  },
  {
    id: 7,
    type: "single",
    question: "Q7. 你偏好的社团氛围是？",
    options: ["轻松", "适中", "高强度"],
    icons: ["😊", "😌", "💪"],
  },
  {
    id: 8,
    type: "single",
    question: "Q8. 你偏好的活动规模是？",
    options: ["小型", "中型", "大型"],
    icons: ["👤", "👥", "🌐"],
  },
  {
    id: 9,
    type: "single",
    question: "Q9. 在社团中，你更想成为？",
    options: ["参与者", "组织者", "核心成员"],
    icons: ["🙋", "📋", "⭐"],
  },
  {
    id: 10,
    type: "single",
    question: "Q10. 对于社团活动，你更倾向于？",
    options: ["尝试新事物", "深度发展"],
    icons: ["🆕", "🎯"],
  },
];

// ==================== 用户画像生成 ====================

function generateUserProfile(answers: Record<number, string | string[]>): UserProfile {
  const q1 = (answers[1] as string[]) || [];
  const q2 = (answers[2] as string) || "";
  const q3 = (answers[3] as string) || "";
  const q4 = (answers[4] as string) || "";
  const q5 = (answers[5] as string) || "";
  const q6 = (answers[6] as string[]) || [];
  const q7 = (answers[7] as string) || "适中";
  const q8 = (answers[8] as string) || "中型";
  const q9 = (answers[9] as string) || "";
  const q10 = (answers[10] as string) || "";

  let activity_level = "中";
  if (q2 === "宅在宿舍") activity_level = "低";
  else if (q2 === "运动" || q2 === "参加活动") activity_level = "高";

  let social_preference = "中";
  if (q3 === "外向") social_preference = "高";
  else if (q3 === "内向") social_preference = "低";

  const exploration_type = q10 === "尝试新事物" ? "探索型" : "专精型";

  let user_type = "兴趣发展型";
  if (q3 === "外向" && q1.includes("社交") && q8 === "大型") {
    user_type = "社交领袖型";
  } else if (q3 === "内向" && q1.includes("技术") && q10 === "深度发展") {
    user_type = "专注成长型";
  } else if (q1.length >= 4 && q10 === "尝试新事物") {
    user_type = "探索体验型";
  } else if ((q5 === "5-10h" || q5 === ">10h") && q6.includes("提升技能")) {
    user_type = "目标驱动型";
  } else if (q6.includes("公益") || q1.includes("公益")) {
    user_type = "公益奉献型";
  }

  return {
    interests: q1,
    personality: q3,
    expression: q4,
    time_commitment: q5,
    goals: q6,
    activity_level,
    social_preference,
    role_preference: q9,
    exploration_type,
    user_type,
    preferred_atmosphere: q7,
    preferred_size: q8,
  };
}

// ==================== 推荐算法 ====================

const interestToTags: Record<string, string[]> = {
  音乐: ["音乐", "吉他", "钢琴", "声乐", "DJ"],
  表演: ["表演", "话剧", "戏剧", "舞蹈"],
  摄影: ["摄影", "艺术"],
  体育: ["体育", "篮球", "足球", "游泳", "武术", "健身", "户外"],
  技术: ["技术", "编程", "AI", "机器人", "建模"],
  社交: ["社交", "服务"],
  写作: ["写作", "新闻", "文学"],
  绘画: ["绘画", "雕塑", "设计", "创意"],
  研究: ["研究", "学术", "科学", "金融", "商业", "法律", "医学"],
  公益: ["公益", "志愿", "教育", "环保"],
};

function generateRecommendations(profile: UserProfile): Recommendation[] {
  const scored = allClubs.map((club) => {
    let score = 0;

    // 1. 兴趣匹配（最高权重）
    profile.interests.forEach((interest) => {
      const relatedTags = interestToTags[interest] || [interest];
      relatedTags.forEach((tag) => {
        if (club.tags.some((t) => t.includes(tag) || tag.includes(t))) {
          score += 20;
        }
      });
      if (club.tags.includes(interest)) score += 10; // 精确匹配额外加分
    });

    // 2. 氛围偏好匹配
    if (profile.preferred_atmosphere && club.atmosphere === profile.preferred_atmosphere) {
      score += 15;
    }

    // 3. 规模偏好匹配
    if (profile.preferred_size && club.size === profile.preferred_size) {
      score += 10;
    }

    // 4. 活动水平匹配
    if (profile.activity_level === club.activityLevel) {
      score += 8;
    }

    // 5. 社交偏好匹配
    if (profile.social_preference === club.socialLevel) {
      score += 8;
    }

    // 6. 性格匹配
    if (profile.personality === "外向" && club.socialLevel === "高") score += 6;
    if (profile.personality === "内向" && club.socialLevel === "低") score += 6;

    // 7. 时间投入匹配
    const timeMap: Record<string, string[]> = {
      "<2h": ["<2h/周"],
      "2-5h": ["2-5h/周"],
      "5-10h": ["5-10h/周"],
      ">10h": [">10h/周"],
    };
    if (profile.time_commitment && timeMap[profile.time_commitment]?.includes(club.timeRequired)) {
      score += 8;
    }

    // 8. 目标匹配
    if (profile.goals.includes("提升技能") && club.activityLevel === "高") score += 5;
    if (profile.goals.includes("交朋友") && club.socialLevel === "高") score += 5;
    if (profile.goals.includes("放松") && club.atmosphere === "轻松") score += 5;
    if (profile.goals.includes("丰富简历") && (club.size === "大型" || club.activityLevel === "高")) score += 4;
    if (profile.goals.includes("社会实践") && club.category === "社会公益类") score += 8;

    // 9. 探索倾向匹配
    if (profile.exploration_type === "探索型" && club.tags.length >= 3) score += 4;
    if (profile.exploration_type === "专精型" && club.atmosphere === "高强度") score += 4;

    // 10. 角色偏好
    if (profile.role_preference === "组织者" && club.size === "大型") score += 5;
    if (profile.role_preference === "参与者" && club.atmosphere === "轻松") score += 5;
    if (profile.role_preference === "核心成员" && club.activityLevel === "高") score += 5;

    return { ...club, score, reason: "" };
  });

  const top = scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return top.map((club) => ({
    ...club,
    reason: generateAIReason(club, profile),
  }));
}

// ==================== AI推荐理由生成 ====================

function generateAIReason(club: Club, profile: UserProfile): string {
  const userTypeReasons: Record<string, string> = {
    社交领袖型: `你天生具有领导魅力和社交能量，${club.name}这样${club.size === "大型" ? "规模宏大、" : ""}活跃度高的平台能让你大放异彩，发挥组织与协调才能。`,
    专注成长型: `作为技术导向、深度专注型用户，${club.name}提供的专业学习环境和高强度实践，正是你突破自我、夯实技能的最佳舞台。`,
    探索体验型: `你兴趣广泛、求知欲强，${club.name}多元化的活动内容和开放包容的氛围，能满足你不断探索、尝试新事物的热情。`,
    目标驱动型: `你目标明确、执行力强，${club.name}在${club.category}领域的深耕和资源积累，能高效助力你的技能提升和职业发展。`,
    公益奉献型: `你心怀大爱、注重社会价值，${club.name}提供了将热情转化为实际行动的平台，让你在付出中获得成长和满足感。`,
    兴趣发展型: `结合你的兴趣偏好和个性特征，${club.name}的${club.atmosphere}氛围和${club.tags.join("、")}相关活动与你的期待高度契合，相信你能在这里找到志同道合的伙伴。`,
  };

  return userTypeReasons[profile.user_type] || userTypeReasons["兴趣发展型"];
}

// ==================== 社团详情弹窗 ====================

function ClubDetailModal({
  club,
  onClose,
}: {
  club: Club;
  onClose: () => void;
}) {
  const catConfig = categoryConfig[club.category];
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部渐变Banner */}
        <div className={`bg-gradient-to-r ${club.color} p-8 text-white rounded-t-3xl relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all"
          >
            ✕
          </button>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-5xl">
              {club.icon}
            </div>
            <div>
              <div className="text-white/70 text-sm mb-1">{club.category}</div>
              <h2 className="text-3xl font-bold">{club.name}</h2>
              <p className="text-white/80 mt-1">{club.shortDesc}</p>
            </div>
          </div>

          {/* 基本信息标签 */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">👥 {club.memberCount}</span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">📅 创立于{club.establishYear}年</span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">⏱️ {club.timeRequired}</span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">🎯 {club.size}</span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 社团简介 */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center text-sm">📋</span>
              社团简介
            </h3>
            <p className="text-gray-600 leading-relaxed">{club.fullDesc}</p>
          </div>

          {/* 亮点 */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-yellow-100 rounded-lg flex items-center justify-center text-sm">⭐</span>
              社团亮点
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {club.highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-3 bg-yellow-50 rounded-xl p-3">
                  <span className="text-yellow-500">✦</span>
                  <span className="text-gray-700 text-sm">{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 主要活动 */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center text-sm">🗓️</span>
              主要活动
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {club.activities.map((a, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 ${catConfig.bgColor} rounded-xl p-3`}
                >
                  <span className="text-indigo-500 text-xs">▶</span>
                  <span className="text-gray-700 text-sm">{a}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 招募要求 */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center text-sm">📌</span>
              招募要求
            </h3>
            <div className="space-y-2">
              {club.requirements.map((r, i) => (
                <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                  <span className="text-indigo-500 font-bold text-sm mt-0.5">{i + 1}.</span>
                  <span className="text-gray-700 text-sm leading-relaxed">{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 氛围标签 */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            {club.tags.map((tag) => (
              <span key={tag} className={`px-3 py-1 ${catConfig.bgColor} text-gray-700 text-sm rounded-full`}>
                {tag}
              </span>
            ))}
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-sm rounded-full">
              {club.atmosphere}氛围
            </span>
            <span className="px-3 py-1 bg-purple-50 text-purple-600 text-sm rounded-full">
              活跃度{club.activityLevel}
            </span>
          </div>

          {/* 报名按钮 */}
          <button
            className={`w-full py-4 bg-gradient-to-r ${club.color} text-white font-bold rounded-2xl hover:shadow-xl transition-all text-lg`}
            onClick={onClose}
          >
            🎉 我要加入 {club.name}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 社团卡片组件 ====================

function ClubCard({ club, onClick }: { club: Club; onClick: () => void }) {
  const catConfig = categoryConfig[club.category];
  return (
    <div
      className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer group overflow-hidden"
      onClick={onClick}
    >
      <div className={`h-1.5 bg-gradient-to-r ${club.color}`} />
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${club.color} flex items-center justify-center text-2xl shadow-md flex-shrink-0`}>
            {club.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">
                {club.name}
              </h3>
              <span className={`text-xs px-2 py-0.5 ${catConfig.bgColor} text-gray-600 rounded-full flex-shrink-0`}>
                {club.size}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1 line-clamp-2">{club.shortDesc}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1 flex-wrap">
            {club.tags.slice(0, 2).map((t) => (
              <span key={t} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                {t}
              </span>
            ))}
          </div>
          <span className="text-xs text-gray-400">{club.memberCount} 👥</span>
        </div>
        <div className="mt-2 text-xs text-indigo-500 font-medium group-hover:underline">
          查看详情 →
        </div>
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

export default function Home() {
  const [pageView, setPageView] = useState<PageView>("home");
  const [activeCategory, setActiveCategory] = useState<ClubCategory>("兴趣爱好类");
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // AI对话完成后的处理
  const handleAIChatComplete = (aiProfile: UserProfileFromAI) => {
    const userProfile = convertAIProfileToUserProfile(aiProfile);
    const recs = generateRecommendations(userProfile);
    
    setProfile(userProfile);
    setRecommendations(recs);
    setPageView("results");
  };

  const currentQuestion = questions[currentStep];
  const isLastQuestion = currentStep === questions.length - 1;
  const categories = Object.keys(categoryConfig) as ClubCategory[];
  const filteredClubs = allClubs.filter((c) => c.category === activeCategory);

  const handleSingleSelect = (option: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option }));
  };

  const handleMultiSelect = (option: string) => {
    setAnswers((prev) => {
      const current = (prev[currentQuestion.id] as string[]) || [];
      if (current.includes(option)) {
        return { ...prev, [currentQuestion.id]: current.filter((o) => o !== option) };
      }
      return { ...prev, [currentQuestion.id]: [...current, option] };
    });
  };

  const canProceed = () => {
    const answer = answers[currentQuestion.id];
    if (currentQuestion.type === "multi") return (answer as string[])?.length > 0;
    return !!answer;
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setIsAnalyzing(true);
      setTimeout(() => {
        const userProfile = generateUserProfile(answers);
        const recs = generateRecommendations(userProfile);
        setProfile(userProfile);
        setRecommendations(recs);
        setIsAnalyzing(false);
        setPageView("results");
      }, 2000);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const resetQuiz = () => {
    setCurrentStep(0);
    setAnswers({});
    setProfile(null);
    setRecommendations([]);
    setPageView("home");
  };

  // AI分析Loading页
  if (isAnalyzing) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-ping opacity-20"></div>
            <div className="relative w-32 h-32 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl">
              <span className="text-5xl">🤖</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">AI正在分析中...</h2>
          <p className="text-gray-500">正在为你生成专属用户画像和社团推荐</p>
          <div className="mt-6 flex justify-center gap-2">
            {[0, 0.15, 0.3].map((delay, i) => (
              <div key={i} className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${delay}s` }} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* ===== 顶部导航栏 ===== */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setPageView("home")}
            className="flex items-center gap-2 font-bold text-xl text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <span className="text-2xl">🤖</span>
            <span>AI社团匹配平台</span>
          </button>
          <nav className="flex gap-2">
            <button
              onClick={() => setPageView("browse")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                pageView === "browse"
                  ? "bg-indigo-500 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              🏠 社团大厅
            </button>
            <button
              onClick={() => { setCurrentStep(0); setAnswers({}); setPageView("quiz"); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                pageView === "quiz" || pageView === "aiChat"
                  ? "bg-indigo-500 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              ✨ 智能匹配
            </button>
          </nav>
        </div>
      </header>

      {/* ===== 首页 ===== */}
      {pageView === "home" && (
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Hero区域 */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 rounded-full text-indigo-600 text-sm font-medium mb-6">
              <span>🎓</span> 找到属于你的社团
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-6 leading-tight">
              发现你的<br />
              <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                完美社团
              </span>
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
              全校 <strong className="text-indigo-600">60+</strong> 个优质社团，覆盖6大类别。完成10题问卷，AI为你精准推荐最适合的社团。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => { setCurrentStep(0); setAnswers({}); setPageView("quiz"); }}
                className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg rounded-2xl hover:shadow-xl hover:scale-105 transition-all"
              >
                ✨ 问卷匹配（10题）
              </button>
              <button
                onClick={() => setPageView("aiChat")}
                className="px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-lg rounded-2xl hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                <span>🤖</span> AI深度对话（推荐）
              </button>
              <button
                onClick={() => setPageView("browse")}
                className="px-8 py-4 border-2 border-gray-200 text-gray-700 font-bold text-lg rounded-2xl hover:border-indigo-300 hover:bg-white transition-all"
              >
                🏠 浏览全部社团
              </button>
            </div>
          </div>

          {/* 6大分类卡片 */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-8">
              🗂️ 六大社团类别
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const cfg = categoryConfig[cat];
                const count = allClubs.filter((c) => c.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat); setPageView("browse"); }}
                    className="group bg-white rounded-2xl p-6 shadow-md hover:shadow-xl hover:scale-105 transition-all text-left border border-gray-100"
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${cfg.color} flex items-center justify-center text-3xl mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                      {cfg.icon}
                    </div>
                    <h3 className="font-bold text-gray-800 text-lg mb-1">{cat}</h3>
                    <p className="text-gray-500 text-sm mb-3">{cfg.desc}</p>
                    <span className="text-indigo-500 text-sm font-medium">{count} 个社团 →</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== 社团浏览页 ===== */}
      {pageView === "browse" && (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">🏠 社团大厅</h2>

          {/* 分类标签栏 */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
            {categories.map((cat) => {
              const cfg = categoryConfig[cat];
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    isActive
                      ? `bg-gradient-to-r ${cfg.color} text-white shadow-lg scale-105`
                      : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span>{cfg.icon}</span>
                  <span>{cat}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${isActive ? "bg-white/20" : "bg-gray-100"}`}>
                    {allClubs.filter((c) => c.category === cat).length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 当前分类介绍 */}
          <div className={`${categoryConfig[activeCategory].bgColor} rounded-2xl p-5 mb-6 flex items-center gap-4`}>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${categoryConfig[activeCategory].color} flex items-center justify-center text-2xl flex-shrink-0`}>
              {categoryConfig[activeCategory].icon}
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">{activeCategory}</h3>
              <p className="text-gray-500 text-sm">{categoryConfig[activeCategory].desc} · 共 {filteredClubs.length} 个社团</p>
            </div>
          </div>

          {/* 社团网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredClubs.map((club) => (
              <ClubCard
                key={club.id}
                club={club}
                onClick={() => setSelectedClub(club)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ===== 问卷页 ===== */}
      {pageView === "quiz" && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">✨ 智能匹配问卷</h1>
            <p className="text-gray-500">完成10道题，获取你的专属社团推荐</p>
          </div>

          {/* 进度条 */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>进度</span>
              <span>{currentStep + 1} / {questions.length}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">{currentQuestion.question}</h2>

            <div className={`grid gap-3 ${currentQuestion.type === "multi" ? "grid-cols-2" : "grid-cols-1"}`}>
              {currentQuestion.options.map((option, idx) => {
                const isSelected =
                  currentQuestion.type === "multi"
                    ? (answers[currentQuestion.id] as string[])?.includes(option)
                    : answers[currentQuestion.id] === option;
                return (
                  <button
                    key={option}
                    onClick={() =>
                      currentQuestion.type === "multi"
                        ? handleMultiSelect(option)
                        : handleSingleSelect(option)
                    }
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50 shadow-md"
                        : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{currentQuestion.icons[idx]}</span>
                      <span className="font-medium text-gray-800 text-sm">{option}</span>
                      {currentQuestion.type === "multi" && isSelected && (
                        <span className="ml-auto text-indigo-500 font-bold">✓</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-4 mt-8">
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep((p) => p - 1)}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-semibold rounded-2xl hover:border-gray-300 hover:bg-gray-50 transition-all"
                >
                  ← 上一题
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`flex-1 py-3 font-semibold rounded-2xl transition-all ${
                  canProceed()
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg hover:scale-[1.02]"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                {isLastQuestion ? "✨ 获取推荐" : "下一题 →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 推荐结果页 ===== */}
      {pageView === "results" && profile && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">🎯 你的专属推荐</h1>
            <p className="text-gray-500">基于AI智能分析，为你精准匹配</p>
          </div>

          {/* 用户画像卡片 */}
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-8">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                👤
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{profile.user_type}</h2>
                <p className="text-gray-500 text-sm">你的专属用户画像</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "性格", value: profile.personality, icon: profile.personality === "外向" ? "🌞" : profile.personality === "内向" ? "🌙" : "⚖️", bg: "bg-indigo-50" },
                { label: "活跃度", value: profile.activity_level, icon: "⚡", bg: "bg-purple-50" },
                { label: "探索倾向", value: profile.exploration_type, icon: "🔍", bg: "bg-pink-50" },
                { label: "角色偏好", value: profile.role_preference, icon: "🎯", bg: "bg-amber-50" },
              ].map((item) => (
                <div key={item.label} className={`${item.bg} rounded-xl p-3 text-center`}>
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <div className="text-xs text-gray-500">{item.label}</div>
                  <div className="font-semibold text-gray-800 text-sm">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
              <span className="text-sm text-gray-500 mr-1">兴趣标签:</span>
              {profile.interests.map((i) => (
                <span key={i} className="px-3 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 text-sm rounded-full">{i}</span>
              ))}
            </div>
          </div>

          {/* 推荐结果 */}
          <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
            🏆 Top {recommendations.length} 推荐社团
          </h3>
          <div className="space-y-4 mb-8">
            {recommendations.map((club, index) => (
              <div
                key={club.id}
                className="bg-white rounded-3xl shadow-lg overflow-hidden hover:shadow-2xl transition-all"
                style={{ animation: `slideIn 0.5s ease-out ${index * 0.15}s both` }}
              >
                <div className={`h-1.5 bg-gradient-to-r ${club.color}`} />
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${club.color} flex items-center justify-center text-3xl shadow-lg flex-shrink-0`}>
                      {club.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <h4 className="text-xl font-bold text-gray-800">{club.name}</h4>
                        {index === 0 && (
                          <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-full">最佳匹配</span>
                        )}
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">{club.category}</span>
                      </div>
                      <p className="text-gray-500 text-sm mb-3">{club.shortDesc}</p>
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 mb-3">
                        <div className="flex items-start gap-2">
                          <span className="text-lg">🤖</span>
                          <p className="text-sm text-gray-700 leading-relaxed">{club.reason}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {club.tags.map((t) => (
                          <span key={t} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">{t}</span>
                        ))}
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-lg">{club.size}</span>
                        <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded-lg">{club.atmosphere}氛围</span>
                      </div>
                      <button
                        onClick={() => setSelectedClub(club)}
                        className={`mt-3 px-4 py-2 bg-gradient-to-r ${club.color} text-white text-sm font-medium rounded-xl hover:shadow-md transition-all`}
                      >
                        查看详情 →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center flex gap-4 justify-center">
            <button
              onClick={resetQuiz}
              className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-2xl hover:shadow-xl transition-all"
            >
              🔄 重新测试
            </button>
            <button
              onClick={() => setPageView("browse")}
              className="px-8 py-3 border-2 border-gray-200 text-gray-600 font-semibold rounded-2xl hover:border-indigo-300 transition-all"
            >
              🏠 浏览所有社团
            </button>
          </div>
        </div>
      )}

      {/* 页脚 */}
      {pageView !== "quiz" && (
        <footer className="text-center py-8 text-gray-400 text-sm">
          <p>🚀 AI社团匹配平台 · 让兴趣找到归属 · 共 {allClubs.length} 个社团</p>
        </footer>
      )}

      {/* AI对话匹配 */}
      {pageView === "aiChat" && (
        <AIChatMatch
          onComplete={handleAIChatComplete}
          onCancel={() => setPageView("home")}
        />
      )}

      {/* 社团详情弹窗 */}
      {selectedClub && (
        <ClubDetailModal club={selectedClub} onClose={() => setSelectedClub(null)} />
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </main>
  );
}
