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
    const today = new Date().toISOString().split('T')[0];
    return `
      You are a medical task analyzer. Your job is to extract actionable items from doctor's notes into a structured format.
      
      CRITICAL INSTRUCTIONS:
      1. You MUST respond with ONLY a valid JSON object
      2. NO explanatory text
      3. NO markdown formatting
      4. NO code blocks
      5. ONLY the raw JSON object
      
      Required format:
      {
        "checklist": [
          {
            "task": "specific task description",
            "dueDate": "${today}" (use today's date if not specified)
          }
        ],
        "plan": [
          {
            "action": "specific action description",
            "frequency": "daily|weekly|as needed",
            "duration": 7,
            "startDate": "${today}"
          }
        ]
      }

      Rules:
      1. ALWAYS convert each checklist item into a task object
      2. ALWAYS convert each plan item into an action object
      3. For checklist items without specific dates, use today's date
      4. For plan items:
         - If frequency not specified, use "as needed"
         - If duration not specified, use 7 days
         - If start date not specified, use today's date
      5. Never return empty arrays unless there are truly no items
      6. Convert any bullet points or numbered lists into proper items

      Example Input:
      "Patient reports mild headaches. Take painkillers and rest."

      Example Output:
      {
        "checklist": [
          {
            "task": "Take painkillers",
            "dueDate": "${today}"
          }
        ],
        "plan": [
          {
            "action": "Rest",
            "frequency": "as needed",
            "duration": 7,
            "startDate": "${today}"
          }
        ]
      }

      Doctor's Note:
      ${note}
    `;
  }

  private sanitizeResponse(response: string): string {
    // Remove any markdown code block markers
    let cleaned = response.replace(/```[a-z]*\n?|\n?```/g, '');
    
    // Remove any explanatory text before or after the JSON
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    
    // Remove any remaining whitespace
    cleaned = cleaned.trim();
    
    // Validate that it starts with { and ends with }
    if (!cleaned.startsWith('{') || !cleaned.endsWith('}')) {
      throw new LLMError('Response is not a valid JSON object');
    }
    
    return cleaned;
  }

  private validateAndTransformResponse(parsed: any): ActionableSteps {
    // Ensure checklist exists and is an array
    if (!parsed.checklist || !Array.isArray(parsed.checklist)) {
      throw new LLMError('Missing or invalid checklist array in LLM response');
    }

    // Ensure plan exists and is an array
    if (!parsed.plan || !Array.isArray(parsed.plan)) {
      throw new LLMError('Missing or invalid plan array in LLM response');
    }

    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];

    // Transform and validate checklist items
    const checklist = parsed.checklist.map((item: any) => {
      if (typeof item === 'string') {
        // Convert string items to proper format
        return {
          task: item,
          dueDate: new Date(formattedToday)
        };
      }
      return {
        task: item.task || 'Unspecified task',
        dueDate: item.dueDate ? new Date(item.dueDate) : new Date(formattedToday)
      };
    });

    // Transform and validate plan items
    const plan = parsed.plan.map((item: any) => {
      if (typeof item === 'string') {
        // Convert string items to proper format
        return {
          action: item,
          frequency: 'as needed',
          duration: 7,
          startDate: new Date(formattedToday)
        };
      }
      return {
        action: item.action || 'Unspecified action',
        frequency: item.frequency || 'as needed',
        duration: typeof item.duration === 'number' && !isNaN(item.duration) ? item.duration : 7,
        startDate: item.startDate ? new Date(item.startDate) : new Date(formattedToday)
      };
    });

    return { checklist, plan };
  }

  public async processNote(note: string): Promise<ActionableSteps> {
    try {
      console.log('Starting note processing...');
      const prompt = await this.generatePrompt(note);
      
      console.log('Sending request to Gemini...');
      const result = await this.model.generateContent(prompt);
      
      const response = result.response.text();
      console.log('Raw response:', response);
      
      try {
        console.log('Attempting to parse response...');
        const sanitizedResponse = this.sanitizeResponse(response);
        console.log('Sanitized response:', sanitizedResponse);
        
        const parsed = JSON.parse(sanitizedResponse);
        console.log('Parsed response:', parsed);

        // Transform and validate the response
        const transformedResponse = this.validateAndTransformResponse(parsed);
        console.log('Transformed response:', transformedResponse);

        // Final validation to ensure we have valid data
        if (transformedResponse.checklist.length === 0 && transformedResponse.plan.length === 0) {
          console.warn('Warning: Both checklist and plan are empty. Original note:', note);
        }

        return transformedResponse;
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
      throw error;
    }
  }
} 