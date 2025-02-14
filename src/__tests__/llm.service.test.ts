import { LLMService } from '../services/llm.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock the Google Generative AI
jest.mock('@google/generative-ai');

describe('LLMService', () => {
  let llmService: LLMService;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock the generateContent response
    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: () => JSON.stringify({
              checklist: [
                {
                  task: "Take painkillers",
                  dueDate: "2024-02-14"
                }
              ],
              plan: [
                {
                  action: "Rest",
                  frequency: "daily",
                  duration: 7,
                  startDate: "2024-02-14"
                }
              ]
            })
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
    });

    it('should handle empty notes', async () => {
      const note = "";
      await expect(llmService.processNote(note)).resolves.toEqual({
        checklist: [],
        plan: []
      });
    });

    it('should convert string items to proper format', async () => {
      // Mock the LLM to return string items
      (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: () => JSON.stringify({
                checklist: ["Take medicine"],
                plan: ["Rest for a week"]
              })
            }
          })
        })
      }));

      const note = "Take medicine and rest for a week";
      const result = await llmService.processNote(note);

      expect(result.checklist[0]).toHaveProperty('task');
      expect(result.checklist[0]).toHaveProperty('dueDate');
      expect(result.plan[0]).toHaveProperty('action');
      expect(result.plan[0]).toHaveProperty('frequency');
      expect(result.plan[0]).toHaveProperty('duration');
      expect(result.plan[0]).toHaveProperty('startDate');
    });

    it('should handle malformed LLM responses', async () => {
      // Mock an invalid response
      (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: () => "Invalid JSON"
            }
          })
        })
      }));

      const note = "Test note";
      await expect(llmService.processNote(note)).rejects.toThrow();
    });
  });
}); 