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

// 系统提示词 - 优化版，更精准的画像提取
const SYSTEM_PROMPT = `你是专业的社团匹配顾问，通过深度对话精准分析学生特征，推荐最适合的社团。

【核心任务】
1. 自然流畅对话，建立信任感
2. 从回答中提取关键特征，实时更新画像
3. 第10轮综合分析，生成精准推荐

【画像维度定义】（必须严格按以下标准判断）

1. 兴趣领域(interests)：具体爱好，如["音乐","篮球","编程","摄影"]

2. 兴趣类型(interestType)：
   - 创作型：喜欢创作内容（写作、绘画、编曲、拍视频）
   - 欣赏型：喜欢体验/消费内容（看电影、听音乐、看比赛）
   - 社交型：喜欢和人互动（聚会、聊天、组织活动）
   - 竞技型：喜欢竞争挑战（比赛、游戏、体育对抗）
   - 研究型：喜欢探索学习（阅读、实验、技术研究）

3. 性格倾向(personality)：
   - 外向：主动社交，从人群中获得能量
   - 内向：享受独处，深度思考后表达
   - ambivert：灵活适应，视情况而定

4. 社交偏好(socialPreference)：
   - 高：喜欢大型活动、认识很多人
   - 中：适中规模，既有熟悉面孔也有新朋友
   - 低：小圈子深度交流，不喜欢人太多

5. 活动规模(preferredSize)：
   - 小型：<15人，亲密交流
   - 中型：15-50人，有组织的活动
   - 大型：>50人，大型活动/演出/比赛

6. 时间投入(timeCommitment)：
   - <2h：偶尔参与
   - 2-5h：每周常规参与
   - 5-10h：投入较多时间
   - >10h：深度投入，可能担任职务

7. 核心目标(goals)：["交朋友","提升技能","丰富简历","探索兴趣","放松","社会实践"]

8. 角色偏好(rolePreference)：
   - 领导者：喜欢统筹规划，带领团队
   - 执行者：踏实完成任务，可靠
   - 创意者：提供新想法，创新思维
   - 协调者：沟通协调，维护团队和谐
   - 参与者：跟随参与，享受过程

9. 活动强度(activityLevel)：
   - 高：高强度训练/排练/备赛
   - 中：定期活动，有节奏感
   - 低：轻松随意，无压力

10. 探索类型(explorationType)：
    - 探索型：喜欢尝试多种不同事物
    - 专精型：喜欢深入钻研一个方向

【每轮必须输出画像更新】
根据本轮对话，在回复末尾用JSON格式输出检测到的特征：
---PROFILE_UPDATE---
{
  "interests": ["..."],
  "interestType": "...",
  "personality": "...",
  "socialPreference": "...",
  "preferredSize": "...",
  "timeCommitment": "...",
  "goals": ["..."],
  "rolePreference": "...",
  "activityLevel": "...",
  "explorationType": "..."
}
---END---

只输出有把握检测到的字段，不确定的不要输出。`;

// 对话轮次引导提示 - 每轮明确提取目标
export const ROUND_PROMPTS: Record<number, string> = {
  1: `【第1轮：兴趣初探】
目标：了解用户的兴趣领域(interests)和兴趣类型(interestType)

开场白示例：
"嗨！想帮你找到最适合的社团😊 平时没课的时候，你最喜欢做什么来放松自己？"

根据用户回答，判断：
- 具体喜欢什么活动 → interests
- 是创作、欣赏、社交、竞技还是研究 → interestType

必须输出画像更新。`,

  2: `【第2轮：兴趣深挖】
目标：确认interestType，初步了解personality

追问示例：
"听起来你喜欢[用户提到的兴趣]！想了解一下，你更喜欢[相关创作行为]，还是[相关欣赏/体验行为]？"

判断：
- 创作型 vs 欣赏型 vs 社交型 → interestType
- 回答中是否表现出主动分享欲 → personality线索`,

  3: `【第3轮：性格探索】
目标：确定personality和socialPreference

提问示例：
"想象一个周末聚会，有很多不太熟的人。你会：A)主动找话题认识新朋友 B)和熟悉的人待在一起 C)找个安静的角落？"

判断：
- 选A→外向+社交偏好高
- 选B→ambivert+社交偏好中  
- 选C→内向+社交偏好低`,

  4: `【第4轮：社交规模偏好】
目标：确定preferredSize

提问示例：
"社团活动里，你更喜欢哪种氛围？
- 10人左右的小圈子，大家都能深度交流
- 30人左右的中型活动，有组织但不拘束  
- 50人以上的大型活动，热闹有气氛"

直接对应：小型/中型/大型`,

  5: `【第5轮：时间投入】
目标：确定timeCommitment和activityLevel

提问示例：
"如果加入社团，你每周大概能投入多少时间？另外，你希望社团活动是轻松随意的，还是有一定强度和纪律性的？"

判断：
- 时间多少 → timeCommitment
- 对强度的态度 → activityLevel`,

  6: `【第6轮：核心目标】
目标：确定goals

提问示例：
"加入社团，你最希望获得什么？（可多选）
- 认识志同道合的朋友
- 学习新技能/提升能力
- 丰富简历，对未来有帮助
- 探索新的兴趣领域
- 放松解压，纯粹娱乐
- 做公益，回馈社会"

对应到：交朋友/提升技能/丰富简历/探索兴趣/放松/社会实践`,

  7: `【第7轮：冲突应对】
目标：验证timeCommitment和activityLevel

场景题：
"假设临近期末考试，社团正好有个重要活动需要你参与，你会怎么选择？"

判断：
- 优先活动→activityLevel高，可能timeCommitment也高
- 优先考试但会协调时间→activityLevel中
- 优先考试且减少社团时间→activityLevel低`,

  8: `【第8轮：团队角色】
目标：确定rolePreference

提问示例：
"在小组作业或团队活动中，你通常：
- 主动承担领导角色，分配任务
- 踏实完成分配给自己的部分
- 提出创意和想法
- 协调沟通，化解矛盾
- 跟随大家，配合完成"

对应：领导者/执行者/创意者/协调者/参与者`,

  9: `【第9轮：探索vs专精】
目标：确定explorationType

提问示例：
"面对一个新的兴趣领域，你更倾向于：
A)广泛尝试多种相关活动，保持新鲜感
B)选择一个方向深入钻研，成为高手"

判断：A→探索型，B→专精型`,

  10: `【第10轮：总结确认】
目标：生成完整画像，推荐社团方向

任务：
1. 总结用户画像特征
2. 生成userType（如"社交领袖型"、"专注成长型"等）
3. 推荐2-3个适合的社团方向
4. 询问用户是否认同

输出格式：
---PROFILE_UPDATE---
{
  "interests": [...],
  "interestType": "...",
  "personality": "...",
  "socialPreference": "...",
  "preferredSize": "...",
  "timeCommitment": "...",
  "goals": [...],
  "rolePreference": "...",
  "activityLevel": "...",
  "explorationType": "...",
  "userType": "...",
  "confidence": 0.9
}
---END---`,
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
