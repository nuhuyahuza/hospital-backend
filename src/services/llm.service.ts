import { GoogleGenerativeAI } from '@google/generative-ai';

interface ActionableSteps {
  checklist: Array<{
    task: string;
    dueDate?: Date;
  }>;
  plan: Array<{
    action: string;
    frequency: string;
    duration: number;
    startDate: Date;
  }>;
}

export class LLMService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  private async generatePrompt(note: string): Promise<string> {
    return `
      Analyze the following doctor's note and extract two types of actionable items:
      1. Checklist: One-time tasks that need to be completed (e.g., "buy medication X")
      2. Plan: Scheduled actions with frequency and duration (e.g., "take medication X daily for 7 days")
      
      Format the response as a JSON object with two arrays:
      {
        "checklist": [{"task": "...", "dueDate": "YYYY-MM-DD"}],
        "plan": [{"action": "...", "frequency": "...", "duration": N, "startDate": "YYYY-MM-DD"}]
      }

      Doctor's Note:
      ${note}
    `;
  }

  public async processNote(note: string): Promise<ActionableSteps> {
    try {
      const prompt = await this.generatePrompt(note);
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      try {
        const parsed = JSON.parse(response);
        return {
          checklist: parsed.checklist.map((item: any) => ({
            task: item.task,
            dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
          })),
          plan: parsed.plan.map((item: any) => ({
            action: item.action,
            frequency: item.frequency,
            duration: parseInt(item.duration),
            startDate: new Date(item.startDate),
          })),
        };
      } catch (error) {
        console.error('Error parsing LLM response:', error);
        throw new Error('Failed to parse LLM response');
      }
    } catch (error) {
      console.error('Error processing note with LLM:', error);
      throw new Error('Failed to process note with LLM');
    }
  }
} 