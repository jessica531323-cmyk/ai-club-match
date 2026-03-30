import { NextRequest, NextResponse } from 'next/server';

const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY || '';
const VOLCENGINE_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

export async function POST(request: NextRequest) {
  // 检查 API Key
  if (!VOLCENGINE_API_KEY) {
    return NextResponse.json(
      { error: 'API Key not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { messages, temperature = 0.7, max_tokens = 800 } = body;

    // 使用用户提供的 model name
    const model = 'doubao-seed-2-0-pro-260215';

    const response = await fetch(VOLCENGINE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VOLCENGINE_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Volcengine API error:', errorText);
      return NextResponse.json(
        { error: 'API request failed', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
