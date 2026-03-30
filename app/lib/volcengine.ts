// 火山引擎 API 集成模块（通过本地 API Route）
// 文档: https://www.volcengine.com/docs/82379

const API_ENDPOINT = '/api/chat';

export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type UserProfileFromAI = {
  interests: string[];
  interestType: '创作型' | '欣赏型' | '社交型' | '竞技型' | '研究型';
  personality: '外向' | '内向' | 'ambivert';
  socialPreference: '高' | '中' | '低';
  preferredSize: '小型' | '中型' | '大型';
  timeCommitment: '<2h' | '2-5h' | '5-10h' | '>10h';
  goals: string[];
  rolePreference: '领导者' | '执行者' | '创意者' | '协调者' | '参与者';
  activityLevel: '高' | '中' | '低';
  explorationType: '探索型' | '专精型';
  userType: string;
  confidence: number;
};

// 系统提示词 - 精简版，更快响应
const SYSTEM_PROMPT = `你是社团匹配顾问，通过10轮对话了解学生，推荐最适合的社团。

【回复要求】
- 每次回复控制在2-3句话，简洁友好
- 根据用户回答，自然过渡到下一个话题

【画像维度】
interests:具体爱好(如["音乐","篮球"])
interestType:创作型/欣赏型/社交型/竞技型/研究型
personality:外向/内向/ambivert
socialPreference:高/中/低
preferredSize:小型/中型/大型
timeCommitment:<2h/2-5h/5-10h/>10h
goals:["交朋友","提升技能","丰富简历","探索兴趣","放松","社会实践"]
rolePreference:领导者/执行者/创意者/协调者/参与者
activityLevel:高/中/低
explorationType:探索型/专精型

【必须输出】
每轮在回复末尾用JSON输出检测到的特征：
---PROFILE_UPDATE---
{"interests":["..."],"interestType":"...",...}
---END---
只输出有把握的字段。`;

// 对话轮次引导提示 - 精简版
export const ROUND_PROMPTS: Record<number, string> = {
  1: `第1轮：询问兴趣爱好。开场："嗨！想帮你找到最适合的社团😊 平时没课的时候，你最喜欢做什么来放松自己？" 提取interests和interestType。`,

  2: `第2轮：深挖兴趣类型。追问是喜欢创作、欣赏、社交、竞技还是研究。提取interestType。`,

  3: `第3轮：探索性格。问聚会场景偏好，判断personality和socialPreference。`,

  4: `第4轮：了解规模偏好。问喜欢小型/中型/大型活动，提取preferredSize。`,

  5: `第5轮：询问时间投入。问每周能投入多久、希望轻松还是有强度，提取timeCommitment和activityLevel。`,

  6: `第6轮：了解核心目标。问加入社团最想获得什么（交朋友/提升技能/丰富简历/探索兴趣/放松/社会实践），提取goals。`,

  7: `第7轮：验证投入度。用期末冲突场景验证timeCommitment和activityLevel。`,

  8: `第8轮：了解团队角色。问在小组中通常扮演什么角色，提取rolePreference。`,

  9: `第9轮：探索vs专精。问面对新领域是广泛尝试还是深入钻研，提取explorationType。`,

  10: `第10轮：总结画像。总结用户特征，生成userType，推荐2-3个社团方向，询问是否认同。输出完整PROFILE_UPDATE。`,
};

// 调用本地 API Route
export async function chatWithAI(
  messages: Message[],
  round: number
): Promise<{ reply: string; profileUpdate?: Partial<UserProfileFromAI> }> {
  try {
    const roundPrompt = ROUND_PROMPTS[round] || '';
    const fullMessages: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: roundPrompt },
      ...messages,
    ];

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'doubao-seed-2-0-pro-260215',
        messages: fullMessages,
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API error:', errorData);
      return {
        reply: `抱歉，服务暂时不可用 (${response.status})。请稍后重试。`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // 解析回复中的画像更新
    const profileUpdate = extractProfileUpdate(content);
    const cleanReply = content.replace(/---PROFILE_UPDATE---[\s\S]*?---END---/, '').trim();

    return { reply: cleanReply, profileUpdate };
  } catch (error) {
    console.error('Chat API调用失败:', error);
    return {
      reply: '抱歉，我这边出了点小问题😅 能再说一遍吗？',
    };
  }
}

// 从AI回复中提取画像更新
function extractProfileUpdate(content: string): Partial<UserProfileFromAI> | undefined {
  const match = content.match(/---PROFILE_UPDATE---\n?([\s\S]*?)\n?---END---/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

// 第10轮：综合所有对话生成完整画像
export async function generateFinalProfile(
  allMessages: Message[]
): Promise<UserProfileFromAI> {
  const summaryPrompt = `基于以上所有对话，生成完整的用户画像JSON。必须包含：
{
  "interests": ["兴趣1", "兴趣2"],
  "interestType": "创作型/欣赏型/社交型/竞技型/研究型",
  "personality": "外向/内向/ambivert",
  "socialPreference": "高/中/低",
  "preferredSize": "小型/中型/大型",
  "timeCommitment": "<2h/2-5h/5-10h/>10h",
  "goals": ["目标1", "目标2"],
  "rolePreference": "领导者/执行者/创意者/协调者/参与者",
  "activityLevel": "高/中/低",
  "explorationType": "探索型/专精型",
  "userType": "根据特征生成一个类型名称",
  "confidence": 0.85
}

只输出JSON，不要有其他内容。`;

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'doubao-seed-2-0-pro-260215',
        messages: [
          ...allMessages,
          { role: 'user', content: summaryPrompt },
        ],
        temperature: 0.3,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // 尝试从回复中提取JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as UserProfileFromAI;
    }
    throw new Error('无法解析画像');
  } catch (error) {
    console.error('生成最终画像失败:', error);
    // 返回默认画像
    return {
      interests: ['综合发展'],
      interestType: '社交型',
      personality: 'ambivert',
      socialPreference: '中',
      preferredSize: '中型',
      timeCommitment: '2-5h',
      goals: ['交朋友', '探索兴趣'],
      rolePreference: '参与者',
      activityLevel: '中',
      explorationType: '探索型',
      userType: '兴趣发展型',
      confidence: 0.5,
    };
  }
}
