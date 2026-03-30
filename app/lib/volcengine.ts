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

// 系统提示词
const SYSTEM_PROMPT = `你是社团匹配助手，一个专业友善的AI顾问。任务是通过自然对话了解学生，推荐最适合的大学社团。

对话原则：
1. 每次回复控制在2-3句话，保持对话流畅
2. 用emoji让对话更生动，但不要过度使用
3. 根据用户回答，自然过渡到下一个话题
4. 第10轮需要总结画像并询问确认

画像维度（每轮对话后更新）：
- 兴趣领域：具体喜欢什么
- 兴趣类型：创作/欣赏/社交/竞技/研究
- 性格倾向：外向/内向/中间
- 社交偏好：喜欢人多/适中/小圈子
- 时间投入：每周能投入多久
- 核心目标：想获得什么
- 角色偏好：在团队中倾向什么角色
- 活动强度：喜欢高强度还是轻松

输出格式：
正常对话后，如果检测到画像信息，在回复末尾用JSON格式输出：
---PROFILE_UPDATE---
{"interests": ["..."], "personality": "..."}
---END---`;

// 对话轮次引导提示
export const ROUND_PROMPTS: Record<number, string> = {
  1: `这是第1轮对话。以友好方式开场，询问用户平时的兴趣爱好。不要一次性问太多，先打开话题。`,
  2: `第2轮：基于用户提到的兴趣，深入挖掘。是喜欢创作、欣赏、还是和人一起玩？`,
  3: `第3轮：探索性格。通过聚会场景了解用户是外向还是内向。`,
  4: `第4轮：了解社交规模偏好。小圈子深度交流 vs 大型活动热闹氛围。`,
  5: `第5轮：询问时间投入。了解学业和社团的平衡考虑。`,
  6: `第6轮：探索核心目标。技能、人脉、放松、还是其他？`,
  7: `第7轮：通过冲突场景测试责任心和优先级。`,
  8: `第8轮：了解团队角色偏好。领导、执行、创意、协调？`,
  9: `第9轮：通过过往经历了解价值观和深层动机。`,
  10: `第10轮：总结画像，生成用户类型，推荐社团方向，询问用户反馈。`,
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
        max_tokens: 800,
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
        max_tokens: 1000,
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
