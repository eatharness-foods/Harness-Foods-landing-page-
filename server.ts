import express from "express";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.post("/api/send-recipes", async (req, res) => {
    try {
      const { email, name, recipes } = req.body;
      
      if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not configured. Please add it to your environment variables.");
      }

      const resend = new Resend(process.env.RESEND_API_KEY);

      // Format recipes into HTML
      const recipesHtml = recipes.map((r: any) => `
        <div style="margin-bottom: 30px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #008037; margin-top: 0; font-size: 24px;">${r.title}</h2>
          <p style="color: #475569; font-size: 16px;">${r.description}</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="color: #1e293b; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Why it works for you</h3>
            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 0;">${r.benefits}</p>
          </div>

          ${r.nutrition ? `
          <div style="display: flex; gap: 10px; margin: 15px 0;">
            <div style="background: #f1f5f9; padding: 8px 12px; border-radius: 6px; text-align: center; flex: 1;">
              <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Calories</div>
              <div style="font-weight: bold; color: #334155;">${r.nutrition.calories}</div>
            </div>
            <div style="background: #f1f5f9; padding: 8px 12px; border-radius: 6px; text-align: center; flex: 1;">
              <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Protein</div>
              <div style="font-weight: bold; color: #334155;">${r.nutrition.protein}g</div>
            </div>
            <div style="background: #f1f5f9; padding: 8px 12px; border-radius: 6px; text-align: center; flex: 1;">
              <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Carbs</div>
              <div style="font-weight: bold; color: #334155;">${r.nutrition.carbs}g</div>
            </div>
            <div style="background: #f1f5f9; padding: 8px 12px; border-radius: 6px; text-align: center; flex: 1;">
              <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Fats</div>
              <div style="font-weight: bold; color: #334155;">${r.nutrition.fats}g</div>
            </div>
          </div>
          ` : ''}
          
          <h3 style="color: #1e293b; font-size: 16px;">Ingredients</h3>
          <ul style="color: #475569; font-size: 14px; line-height: 1.6;">
            ${r.ingredients.map((i: any) => `<li><strong>${i.amount} ${i.unit}</strong> ${i.name}</li>`).join('')}
          </ul>
          
          <h3 style="color: #1e293b; font-size: 16px;">Instructions</h3>
          <ol style="color: #475569; font-size: 14px; line-height: 1.6;">
            ${r.instructions.map((step: string) => `<li>${step}</li>`).join('')}
          </ol>
        </div>
      `).join('');

      const { data, error } = await resend.emails.send({
        from: 'Harness Foods <onboarding@resend.dev>',
        to: email,
        subject: 'Your Personalized Meal Prep Recipes',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #008037; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 0.1em;">Harness Foods</h1>
              <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Clean Eating. No Compromises.</p>
            </div>
            <h2 style="color: #1e293b; font-size: 20px;">Hi ${name},</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">Here are your personalized meal prep recipes, tailored specifically to your health goals and chronic illness management:</p>
            ${recipesHtml}
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #64748b; font-size: 14px;">
                <strong>Medical Disclaimer:</strong> Please consult your physician or dietician before making drastic changes to your diet.
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">
                © 2026 Harness Foods Inc.<br>
                GTA-wide Delivery Available
              </p>
            </div>
          </div>
        `
      });

      if (error) {
        console.error("Resend API Error details:", error);
        
        // Handle common Resend errors gracefully for the user
        let userMessage = error.message;
        if (error.name === 'validation_error' || error.message?.includes('validation')) {
          userMessage = "Recipient email is unverified. If you are using a Resend free trial, you can only send emails to the address associated with your account.";
        } else if (error.message?.includes('API key')) {
          userMessage = "Invalid or missing Resend API key. Please check your project settings.";
        }

        return res.status(400).json({ 
          error: userMessage,
          details: error // Include original error for debugging if needed
        });
      }

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
