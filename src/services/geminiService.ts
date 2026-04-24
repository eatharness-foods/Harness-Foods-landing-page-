import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface SurveyData {
  name: string;
  email: string;
  healthGoals: string[];
  specificIllness?: string;
  weightGoal: string;
  activityLevel: string;
  cuisines: string[];
  dietaryRestrictions: string[];
}

export interface Ingredient {
  amount: number;
  unit: string;
  name: string;
}

export interface MealIdea {
  title: string;
  description: string;
  benefits: string;
  ingredients: Ingredient[];
  instructions: string[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  tags: string[];
}

export async function generateMealSuggestions(data: SurveyData): Promise<MealIdea[]> {
  const healthGoalsStr = data.healthGoals.join(", ") + (data.specificIllness ? ` (Specific Illness: ${data.specificIllness})` : "");
  const prompt = `
    Generate 3 personalized meal prep ideas for a person with the following profile:
    - Name: ${data.name}
    - Health Goals: ${healthGoalsStr}
    - Weight Goal: ${data.weightGoal}
    - Activity Level: ${data.activityLevel}
    - Preferred Cuisines: ${data.cuisines.join(", ")}
    - Dietary Restrictions: ${data.dietaryRestrictions.join(", ") || "None"}

    The person has chronic illnesses, so the meals should be:
    1. Easy to prepare (low energy required).
    2. Nutrient-dense.
    3. Tailored to their specific health goals and illness.
    4. Aligned with their preferred cuisines.
    5. Strictly adhere to their dietary restrictions.

    Return the response as a JSON array of 3 objects, each with:
    - title: String (catchy name of the meal)
    - description: String (brief overview of the meal)
    - benefits: String (A 'Why it works' explanation detailing exactly how this meal benefits their specific health goals and conditions. You MUST explicitly name the ingredients and explain the specific benefit each provides for their condition: ${healthGoalsStr})
    - tags: Array of Strings (3-5 relevant tags describing the meal, e.g., 'low-carb', 'high-protein', 'anti-inflammatory', 'gluten-free', 'dairy-free')
    - ingredients: Array of Objects (each with 'amount' (number), 'unit' (string, e.g., 'cup', 'tbsp', 'oz', 'whole', use '' if none), 'name' (string, the ingredient name)). IMPORTANT: Scale the ingredients for EXACTLY 1 serving.
    - instructions: Array of Strings (step-by-step preparation instructions)
    - nutrition: Object with calories (number), protein (number), carbs (number), fats (number) scaled for EXACTLY 1 serving.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              benefits: { type: Type.STRING },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    amount: { type: Type.NUMBER },
                    unit: { type: Type.STRING },
                    name: { type: Type.STRING }
                  },
                  required: ["amount", "unit", "name"]
                }
              },
              instructions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              nutrition: {
                type: Type.OBJECT,
                properties: {
                  calories: { type: Type.NUMBER },
                  protein: { type: Type.NUMBER },
                  carbs: { type: Type.NUMBER },
                  fats: { type: Type.NUMBER }
                },
                required: ["calories", "protein", "carbs", "fats"]
              }
            },
            required: ["title", "description", "benefits", "tags", "ingredients", "instructions", "nutrition"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating meal suggestions:", error);
    // Fallback data in case of API failure
    return [
      {
        title: "Quinoa & Roasted Vegetable Power Bowl",
        description: "A balanced bowl with colorful roasted veggies and protein-rich quinoa.",
        benefits: "The high fiber content from quinoa and chickpeas helps stabilize blood sugar levels, while the antioxidants in bell peppers and zucchini actively work to reduce systemic inflammation associated with chronic conditions.",
        tags: ["high-fiber", "anti-inflammatory", "plant-based", "gluten-free"],
        ingredients: [
          { amount: 0.25, unit: "cup", name: "Quinoa" },
          { amount: 0.5, unit: "whole", name: "Bell peppers, sliced" },
          { amount: 0.25, unit: "whole", name: "Zucchini, diced" },
          { amount: 0.25, unit: "can", name: "Chickpeas, rinsed" },
          { amount: 1, unit: "tbsp", name: "Lemon-tahini dressing" }
        ],
        instructions: ["Preheat oven to 400°F (200°C).", "Toss vegetables and chickpeas with olive oil, salt, and pepper.", "Roast for 20-25 minutes until tender.", "Cook quinoa according to package instructions.", "Assemble bowls with quinoa, roasted veggies, and drizzle with dressing."],
        nutrition: { calories: 450, protein: 15, carbs: 65, fats: 18 }
      },
      {
        title: "Lemon Herb Baked Salmon",
        description: "Flaky salmon seasoned with fresh herbs and served with steamed asparagus.",
        benefits: "Salmon provides a potent dose of Omega-3 fatty acids which are crucial for cardiovascular health and reducing joint pain. Asparagus acts as a natural diuretic, aiding in kidney function and reducing bloating.",
        tags: ["high-protein", "omega-3", "low-carb", "anti-inflammatory"],
        ingredients: [
          { amount: 1, unit: "fillet", name: "Salmon" },
          { amount: 0.5, unit: "bunch", name: "Asparagus" },
          { amount: 0.5, unit: "whole", name: "Lemon, sliced" },
          { amount: 0.5, unit: "tbsp", name: "Fresh dill" },
          { amount: 1, unit: "clove", name: "Garlic, minced" }
        ],
        instructions: ["Preheat oven to 375°F (190°C).", "Place salmon on a baking sheet lined with parchment paper.", "Season with garlic, dill, salt, pepper, and top with lemon slices.", "Bake for 12-15 minutes until cooked through.", "Steam asparagus for 5 minutes and serve alongside salmon."],
        nutrition: { calories: 380, protein: 34, carbs: 8, fats: 22 }
      },
      {
        title: "Slow-Cooker Lentil Stew",
        description: "A hearty, low-effort stew packed with plant-based protein.",
        benefits: "Lentils offer a low glycemic index carbohydrate source that prevents energy crashes and supports metabolic health. Turmeric contains curcumin, a powerful natural anti-inflammatory compound that helps manage chronic pain.",
        tags: ["low-glycemic", "plant-based", "anti-inflammatory", "high-protein"],
        ingredients: [
          { amount: 0.25, unit: "cup", name: "Red lentils" },
          { amount: 0.5, unit: "whole", name: "Carrots, chopped" },
          { amount: 0.5, unit: "cup", name: "Spinach" },
          { amount: 1, unit: "cup", name: "Vegetable broth" },
          { amount: 0.25, unit: "tsp", name: "Turmeric" }
        ],
        instructions: ["Add lentils, carrots, broth, and turmeric to a slow cooker.", "Cook on low for 6-8 hours or high for 3-4 hours.", "Stir in spinach during the last 10 minutes of cooking until wilted.", "Season with salt and pepper to taste.", "Serve warm."],
        nutrition: { calories: 320, protein: 18, carbs: 55, fats: 4 }
      }
    ];
  }
}
