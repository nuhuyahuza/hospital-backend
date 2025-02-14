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

// Custom error class for LLM-related errors
class LLMError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'LLMError';
  }
}

export class LLMService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    console.log('Initializing LLM service...');
    console.log('API Key present:', !!process.env.GEMINI_API_KEY);
    console.log('API Key length:', process.env.GEMINI_API_KEY?.length);
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    console.log('LLM service initialized successfully');
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
      console.log('Starting note processing...');
      const prompt = await this.generatePrompt(note);
      console.log('Generated prompt:', prompt);
      
      console.log('Sending request to Gemini...');
      const result = await this.model.generateContent(prompt);
      console.log('Received response from Gemini');
      console.log('Raw response:', result);
      
      const response = result.response.text();
      console.log('Response text:', response);
      
      try {
        console.log('Attempting to parse response...');
        const parsed = JSON.parse(response);
        console.log('Successfully parsed response:', parsed);
        
        // Validate the parsed response has the required structure
        if (!parsed.checklist || !Array.isArray(parsed.checklist) || 
            !parsed.plan || !Array.isArray(parsed.plan)) {
          throw new LLMError('Invalid response format from LLM');
        }
        
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
      } catch (parseError) {
        console.error('Error parsing LLM response:', parseError);
        console.error('Failed response:', response);
        throw new LLMError(
          `Failed to parse LLM response: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`,
          parseError
        );
      }
    } catch (error) {
      console.error('Error processing note with LLM:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      // If it's already an LLMError, rethrow it
      if (error instanceof LLMError) {
        throw error;
      }
      // Otherwise, wrap it in an LLMError
      throw new LLMError(
        `Failed to process note with LLM: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }
} 