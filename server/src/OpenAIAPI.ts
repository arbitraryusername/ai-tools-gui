import OpenAI from 'openai';
import { getOpenAiKey } from './AppConfig';

interface Model {
  id: string;
  inputCost: number;
  outputCost: number;
}

const MODELS: Model[] = [
  {
    id: 'gpt-4o-mini',
    inputCost: 0.150,
    outputCost: 0.60
  },
  {
    id: 'gpt-4o',
    inputCost: 2.50,
    outputCost: 10.00
  },
  {
    id: 'o1-mini',
    inputCost: 3.00,
    outputCost: 12.00
  },
  {
    id: 'o1',
    inputCost: 15.00,
    outputCost: 60.00
  }
] as const;

class OpenAIService {
  private readonly client: OpenAI;

  constructor() {
    const apiKey = getOpenAiKey();
    this.client = new OpenAI({ apiKey });
  }

  async generateCode(prompt: string): Promise<string> {
    try {
      const chatCompletion = await this.client.chat.completions.create({
        model: MODELS[0].id,
        messages: [{ role: 'user' as const, content: prompt }],
      });

      const generatedResponse = chatCompletion.choices[0].message.content;
      console.log("DEBUG returning generatedResponse:", generatedResponse);

      const extractedCode = this.stripMarkdown(generatedResponse || '');
      console.log("DEBUG: Extracted Code:", extractedCode);

      return extractedCode;
    } catch (error) {
      console.error(
        "Error calling OpenAI API:",
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  private stripMarkdown(text: string): string {
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)\n```/g;
    let extractedCode = '';
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match[1]) {
        extractedCode += match[1].trim() + '\n';
      }
    }

    return extractedCode.length > 0 ? extractedCode.trim() : text;
  }
}

const openAIService = new OpenAIService();
export const generateCode = (prompt: string) => openAIService.generateCode(prompt);
export type { Model };