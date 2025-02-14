import { LLMService } from '../services/llm.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock the Google Generative AI
jest.mock('@google/generative-ai');

// Set required environment variables
process.env.GEMINI_API_KEY = 'test-api-key';

describe('LLMService', () => {
  let llmService: LLMService;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Default mock implementation
    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: () => `{
              "checklist": [
                {
                  "task": "Take painkillers",
                  "dueDate": "2024-02-14"
                }
              ],
              "plan": [
                {
                  "action": "Rest",
                  "frequency": "daily",
                  "duration": 7,
                  "startDate": "2024-02-14"
                }
              ]
            }`
          }
        })
      })
    }));

    llmService = new LLMService();
  });

  describe('processNote', () => {
    it('should process a note and return structured data', async () => {
      const note = "Patient reports mild headaches. Take painkillers and rest.";
      const result = await llmService.processNote(note);

      expect(result).toHaveProperty('checklist');
      expect(result).toHaveProperty('plan');
      expect(Array.isArray(result.checklist)).toBe(true);
      expect(Array.isArray(result.plan)).toBe(true);
      expect(result.checklist[0]).toHaveProperty('task', 'Take painkillers');
      expect(result.plan[0]).toHaveProperty('action', 'Rest');
    });

    it('should handle empty notes', async () => {
      // Mock the generateContent method directly for this test
      const mockGenerateContent = jest.fn().mockResolvedValueOnce({
        response: {
          text: () => JSON.stringify({
            checklist: [],
            plan: []
          })
        }
      });

      (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: mockGenerateContent
        })
      }));

      llmService = new LLMService();
      const note = "";
      const result = await llmService.processNote(note);
      
      expect(mockGenerateContent).toHaveBeenCalled();
      expect(result.checklist).toEqual([]);
      expect(result.plan).toEqual([]);
    });

    it('should handle malformed LLM responses', async () => {
      // Mock the generateContent method to return invalid JSON
      const mockGenerateContent = jest.fn().mockResolvedValueOnce({
        response: {
          text: () => 'Some text that is not JSON'
        }
      });

      (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: mockGenerateContent
        })
      }));

      llmService = new LLMService();
      const note = "Test note";
      
      await expect(llmService.processNote(note)).rejects.toThrow('Response is not a valid JSON object');
    });
  });
}); 