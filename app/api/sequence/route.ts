import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/prompt';
import { CardSpec } from '@/lib/types';

export const maxDuration = 30;

const client = new Anthropic();

function extractJSON(text: string): string {
  const match = text.match(/\[[\s\S]*\]/);
  return match ? match[0] : text.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { script, era, intensity } = await req.json();

    if (!script?.trim()) {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 });
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(script, era ?? 'early', intensity ?? 50),
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
    }

    const json = extractJSON(content.text);
    const cards: CardSpec[] = JSON.parse(json);

    return NextResponse.json({ cards });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
