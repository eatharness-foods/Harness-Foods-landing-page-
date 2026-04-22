import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { 
  Leaf, 
  ArrowRight, 
  CheckCircle2, 
  Activity, 
  Heart, 
  Utensils, 
  Scale, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Phone,
  Mail,
  User,
  Sparkles,
  Instagram,
  Facebook,
  Twitter,
  Flame,
  Beef,
  Wheat,
  Droplet,
  Info,
  Plus,
  Minus,
  Truck,
  Download,
  Send
} from 'lucide-react';
import { generateMealSuggestions, SurveyData, MealIdea } from './services/geminiService';

const HEALTH_GOALS = [
  "Manage chronic illness",
  "Heart Health",
  "Reduce Inflammation",
  "Boost Energy",
  "Digestive Support",
  "Build muscle"
];

const CHRONIC_ILLNESSES = [
  "T1 diabetes",
  "T2 diabetes",
  "Hypertension",
  "Arthritis",
  "Osteoperosis",
  "Fatty liver disease"
];

const WEIGHT_GOALS = ["Lose Weight", "Gain Weight", "Maintain Weight"];

const ACTIVITY_LEVELS = [
  "Sedentary (Little to no exercise)",
  "Lightly Active (1-3 days/week)",
  "Moderately Active (3-5 days/week)",
  "Very Active (6-7 days/week)"
];

const CUISINES = ["Everything goes", "Asian", "Modern American", "Mexican", "Italian", "Mediterranean"];

const DIETARY_RESTRICTIONS = [
  "None",
  "Gluten-Free",
  "Dairy-Free",
  "Nut-Free",
  "Soy-free",
  "Vegetarian",
  "Pescatarian"
];

const TYPEWRITER_PHRASES = [
  "chronic illness management",
  "boosting energy levels",
  "building muscle",
  "weight management",
  "lowering inflammation"
];

function Typewriter({ phrases }: { phrases: string[] }) {
  const [text, setText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    const isComplete = text === currentPhrase;
    const isEmpty = text === '';

    let delay = isDeleting ? 40 : 80;
    
    if (isComplete && !isDeleting) {
      delay = 2000;
    } else if (isEmpty && isDeleting) {
      delay = 400;
    }

    const timeout = setTimeout(() => {
      if (!isDeleting && isComplete) {
        setIsDeleting(true);
      } else if (isDeleting && isEmpty) {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
      } else {
        setText(currentPhrase.substring(0, text.length + (isDeleting ? -1 : 1)));
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [text, isDeleting, phraseIndex, phrases]);

  return (
    <span className="text-[#008037] font-medium">
      {text}
      <span className="animate-blink text-slate-300">|</span>
    </span>
  );
}

export default function App() {
  const [step, setStep] = useState(0);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<MealIdea[] | null>(null);
  const [expandedMealIndex, setExpandedMealIndex] = useState<number | null>(null);
  const [servings, setServings] = useState<Record<number, number>>({});
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  
  const getServings = (index: number) => servings[index] || 1;
  const updateServings = (e: any, index: number, delta: number) => {
    e.stopPropagation();
    setServings(prev => ({
      ...prev,
      [index]: Math.max(1, (prev[index] || 1) + delta)
    }));
  };
  const [formData, setFormData] = useState<SurveyData>({
    name: '',
    email: '',
    healthGoals: [],
    specificIllness: '',
    weightGoal: '',
    activityLevel: '',
    cuisines: [],
    dietaryRestrictions: []
  });

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => {
    if (step === 2) {
      setIsSurveyOpen(false);
      setStep(0);
    } else {
      setStep(s => s - 1);
    }
  };

  const toggleSelection = (field: 'healthGoals' | 'cuisines' | 'dietaryRestrictions', value: string) => {
    setFormData(prev => {
      if (field === 'dietaryRestrictions' && value === 'None') {
        return { ...prev, dietaryRestrictions: ['None'] };
      }
      if (field === 'dietaryRestrictions' && prev.dietaryRestrictions.includes('None')) {
        return { ...prev, dietaryRestrictions: [value] };
      }
      return {
        ...prev,
        [field]: prev[field].includes(value)
          ? prev[field].filter(item => item !== value)
          : [...prev[field], value]
      };
    });
  };

  const [emailError, setEmailError] = useState<string | null>(null);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    setEmailError(null);
    try {
      const suggestions = await generateMealSuggestions(formData);
      setResults(suggestions);
      setStep(7); // Show results step
    } catch (error: any) {
      console.error(error);
      setEmailError("Failed to generate your meal plan. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!results) return;
    setIsEmailLoading(true);
    setEmailError(null);
    try {
      const response = await fetch('/api/send-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          recipes: results
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      setIsEmailSent(true);
      setTimeout(() => setIsEmailSent(false), 5000);
    } catch (error: any) {
      console.error(error);
      let errorMessage = error.message;
      
      // The backend now provides specific user-friendly messages for these cases
      setEmailError(errorMessage);
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleSavePDF = () => {
    if (!results) return;
    const doc = new jsPDF();
    let yPos = 20;

    doc.setFontSize(22);
    doc.text(`Meal prep plan for ${formData.name}`, 20, yPos);
    yPos += 15;

    results.forEach((meal, index) => {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(18);
      doc.setTextColor(0, 128, 55); // Primary color
      doc.text(`${index + 1}. ${meal.title}`, 20, yPos);
      yPos += 10;

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("Why it works:", 20, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");
      const benefitsLines = doc.splitTextToSize(meal.benefits, 170);
      doc.text(benefitsLines, 20, yPos);
      yPos += benefitsLines.length * 6 + 4;

      if (meal.nutrition) {
        doc.setFont("helvetica", "bold");
        doc.text("Nutrition (per serving):", 20, yPos);
        yPos += 6;
        doc.setFont("helvetica", "normal");
        doc.text(`Calories: ${meal.nutrition.calories} kcal | Protein: ${meal.nutrition.protein}g | Carbs: ${meal.nutrition.carbs}g | Fats: ${meal.nutrition.fats}g`, 20, yPos);
        yPos += 10;
      }

      doc.setFont("helvetica", "bold");
      doc.text("Ingredients:", 20, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");
      meal.ingredients.forEach(ing => {
        doc.text(`• ${ing.amount} ${ing.unit} ${ing.name}`, 25, yPos);
        yPos += 6;
      });
      yPos += 4;

      doc.setFont("helvetica", "bold");
      doc.text("Instructions:", 20, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");
      meal.instructions.forEach((inst, i) => {
        const instLines = doc.splitTextToSize(`${i + 1}. ${inst}`, 165);
        doc.text(instLines, 25, yPos);
        yPos += instLines.length * 6;
      });
      yPos += 15;
    });

    doc.save(`${formData.name.replace(/\s+/g, '_')}_Meal_Plan.pdf`);
  };

  const isStepValid = () => {
    switch (step) {
      case 1: return formData.name && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
      case 2: 
        if (formData.healthGoals.length === 0) return false;
        if (formData.healthGoals.includes("Manage chronic illness") && !formData.specificIllness) return false;
        return true;
      case 3: return formData.weightGoal !== '';
      case 4: return formData.activityLevel !== '';
      case 5: return formData.cuisines.length > 0;
      case 6: return formData.dietaryRestrictions.length > 0;
      default: return true;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 py-3 sm:py-5">
        <div className="max-w-7xl mx-auto px-6 h-14 sm:h-20 flex items-center justify-between">
          <div className="flex flex-col items-start leading-none select-none">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-primary uppercase font-sans" style={{ letterSpacing: '0.02em' }}>Harness</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-lg sm:text-xl font-normal tracking-tight text-primary uppercase font-sans" style={{ letterSpacing: '0.02em' }}>Foods</span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-primary rounded-full flex items-center justify-center">
                <Utensils className="text-white w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </div>
            </div>
          </div>
          
          {/* GTA-wide delivery icon */}
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-full text-primary">
            <Truck className="w-5 h-5" />
            <span className="text-sm font-semibold whitespace-nowrap">GTA-wide delivery</span>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-20">
        {!isSurveyOpen ? (
          <>
            {/* Hero Section */}
            <section className="relative min-h-[calc(100vh-80px)] flex items-center justify-center overflow-hidden pt-32 lg:pt-40 pb-16">
              {/* Full Screen Background Image */}
              <div className="absolute inset-0 z-0">
                <img 
                  src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=2000" 
                  alt="Healthy Chef Inspired Meal on Marble" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px]"></div>
              </div>

              <div className="max-w-7xl mx-auto w-full relative z-10 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center py-8 lg:py-[35px] px-6">
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                  className="text-center lg:text-left"
                >
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[60px] font-sans font-bold leading-[1.1] mb-0 mr-0 lg:-ml-[70px] lg:w-[700px] text-white drop-shadow-2xl uppercase" style={{ letterSpacing: '0.02em' }}>
                    <span className="text-white drop-shadow-md">Clean Eating.</span><br/>No Compromises.
                  </h1>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="flex justify-center lg:justify-end"
                >
                  <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-[500px] relative">
                    <div className="mb-6">
                      <h3 className="text-2xl font-sans font-normal text-slate-900 leading-snug min-h-[72px] tracking-[0.02em]">
                        Become a founding member and get 3-easy meal prep recipes for <br className="hidden sm:block" />
                        <Typewriter phrases={TYPEWRITER_PHRASES} />
                      </h3>
                    </div>

                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-slate-700">Name</label>
                        <input 
                          type="text" 
                          placeholder="Alex"
                          className="input-field"
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-slate-700">Email address</label>
                        <input 
                          type="email" 
                          placeholder="alex@email.com"
                          className="input-field"
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                      
                      <button 
                        onClick={() => {
                          setIsSurveyOpen(true);
                          setStep(2);
                        }}
                        disabled={!(formData.name && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))}
                        className={`w-full py-3 px-4 rounded-lg border font-semibold transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                          formData.name && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
                            ? 'bg-[#008037] text-white border-[#008037] hover:bg-[#00662c]'
                            : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        Get My Free Meal Plan <ArrowRight className="w-4 h-4" />
                      </button>
                      
                      <p className="text-center text-xs text-slate-500 mt-1">
                        No spam, ever. Unsubscribe anytime. Your info stays private.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* Feature Strip */}
            <section className="bg-[#008037] py-6 px-6">
              <div className="max-w-7xl mx-auto">
                <ul className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-12 gap-y-4">
                  {[
                    "Dietician-approved",
                    "AIP-Friendly",
                    "No seed oils",
                    "Macro-friendly",
                    "Organic ingredients"
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                      <span className="text-sm font-medium text-white uppercase tracking-wider">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>


          </>
        ) : (
          /* Survey Modal/Overlay */
          <div className="fixed inset-0 z-[100] bg-white flex flex-col">
            <div className="h-2 bg-slate-100 w-full flex-shrink-0">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(step / 7) * 100}%` }}
              />
            </div>
            
            <div className="flex-grow overflow-y-auto p-6">
              <div className={`mx-auto w-full min-h-full flex flex-col justify-center py-12 ${step === 7 ? 'max-w-4xl' : 'max-w-2xl'}`}>
                <AnimatePresence mode="wait">
                  {isLoading && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      className="flex flex-col items-center justify-center text-center h-full min-h-[400px]"
                    >
                      <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
                      <h3 className="text-3xl font-display font-bold text-slate-800 mb-3">Crafting your meal plan...</h3>
                      <p className="text-slate-500 text-lg max-w-sm mx-auto">This may take a few moments as our AI analyzes your profile to generate 3 perfect, chef-inspired meals.</p>
                    </motion.div>
                  )}

                  {!isLoading && step === 0 && (
                    <motion.div
                      key="step0"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="text-center"
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8">
                        <Sparkles className="w-8 h-8 sm:w-10 sm:h-10" />
                      </div>
                      <h2 className="text-2xl sm:text-4xl font-display font-bold mb-4 sm:mb-6">Let's find your perfect meal plan.</h2>
                      <p className="text-lg sm:text-xl text-slate-600 mb-8 sm:mb-10">
                        Answer a few questions and our AI will suggest 3 tailored meal prep recipes just for you.
                      </p>
                      <button onClick={handleNext} className="btn-primary">
                        Start Survey
                      </button>
                      <button 
                        onClick={() => setIsSurveyOpen(false)}
                        className="block mx-auto mt-6 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        Maybe later
                      </button>
                    </motion.div>
                  )}

                  {!isLoading && step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                    >
                      <h2 className="text-3xl font-bold mb-8">First, who are we helping?</h2>
                      <div className="space-y-6">
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                          <input 
                            type="text" 
                            placeholder="Full Name"
                            className="input-field pl-12"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                          />
                        </div>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                          <input 
                            type="email" 
                            placeholder="Email Address"
                            className="input-field pl-12"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                          />
                        </div>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                          <input 
                            type="tel" 
                            placeholder="Phone Number"
                            className="input-field pl-12"
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="flex gap-4 mt-12">
                        <button onClick={handleBack} className="px-8 py-4 rounded-full font-medium border border-slate-200">Back</button>
                        <button 
                          onClick={handleNext} 
                          disabled={!isStepValid()}
                          className="btn-primary flex-grow"
                        >
                          Continue
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {!isLoading && step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                    >
                      <h2 className="text-3xl font-bold mb-2">What are your health goals?</h2>
                      <p className="text-slate-500 mb-8">Select all that apply to your journey.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {HEALTH_GOALS.map(goal => (
                          <button
                            key={goal}
                            onClick={() => toggleSelection('healthGoals', goal)}
                            className={`p-4 rounded-2xl border-2 text-left transition-all ${
                              formData.healthGoals.includes(goal)
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{goal}</span>
                              {formData.healthGoals.includes(goal) && <CheckCircle2 className="w-5 h-5" />}
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      {formData.healthGoals.includes("Manage chronic illness") && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-6"
                        >
                          <label className="block text-sm font-bold text-slate-700 mb-2">
                            Please specify your chronic illness
                          </label>
                          <select 
                            className="w-full p-4 rounded-2xl border-2 border-slate-200 bg-white focus:border-primary focus:ring-0 transition-colors"
                            value={formData.specificIllness}
                            onChange={(e) => setFormData({...formData, specificIllness: e.target.value})}
                          >
                            <option value="" disabled>Select an illness</option>
                            {CHRONIC_ILLNESSES.map(illness => (
                              <option key={illness} value={illness}>{illness}</option>
                            ))}
                          </select>
                        </motion.div>
                      )}

                      <div className="flex gap-4 mt-12">
                        <button onClick={handleBack} className="px-8 py-4 rounded-full font-medium border border-slate-200">Back</button>
                        <button 
                          onClick={handleNext} 
                          disabled={!isStepValid()}
                          className="btn-primary flex-grow"
                        >
                          Continue
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {!isLoading && step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                    >
                      <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                        <Scale className="text-primary" /> Weight Objectives
                      </h2>
                      <div className="space-y-4">
                        {WEIGHT_GOALS.map(goal => (
                          <button
                            key={goal}
                            onClick={() => setFormData({...formData, weightGoal: goal})}
                            className={`w-full p-6 rounded-2xl border-2 text-left transition-all ${
                              formData.weightGoal === goal
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <span className="text-lg font-medium">{goal}</span>
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-4 mt-12">
                        <button onClick={handleBack} className="px-8 py-4 rounded-full font-medium border border-slate-200">Back</button>
                        <button 
                          onClick={handleNext} 
                          disabled={!isStepValid()}
                          className="btn-primary flex-grow"
                        >
                          Continue
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {!isLoading && step === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                    >
                      <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                        <Activity className="text-primary" /> Activity Level
                      </h2>
                      <div className="space-y-4">
                        {ACTIVITY_LEVELS.map(level => (
                          <button
                            key={level}
                            onClick={() => setFormData({...formData, activityLevel: level})}
                            className={`w-full p-6 rounded-2xl border-2 text-left transition-all ${
                              formData.activityLevel === level
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <span className="text-lg font-medium">{level}</span>
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-4 mt-12">
                        <button onClick={handleBack} className="px-8 py-4 rounded-full font-medium border border-slate-200">Back</button>
                        <button 
                          onClick={handleNext} 
                          disabled={!isStepValid()}
                          className="btn-primary flex-grow"
                        >
                          Continue
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {!isLoading && step === 5 && (
                    <motion.div
                      key="step5"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                    >
                      <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <Utensils className="text-primary" /> Preferred Cuisines
                      </h2>
                      <p className="text-slate-500 mb-8">What flavors do you enjoy most?</p>
                      <div className="grid grid-cols-2 gap-4">
                        {CUISINES.map(cuisine => (
                          <button
                            key={cuisine}
                            onClick={() => toggleSelection('cuisines', cuisine)}
                            className={`p-4 rounded-2xl border-2 text-left transition-all ${
                              formData.cuisines.includes(cuisine)
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{cuisine}</span>
                              {formData.cuisines.includes(cuisine) && <CheckCircle2 className="w-5 h-5" />}
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-4 mt-12">
                        <button onClick={handleBack} className="px-8 py-4 rounded-full font-medium border border-slate-200">Back</button>
                        <button 
                          onClick={handleNext} 
                          disabled={!isStepValid()}
                          className="btn-primary flex-grow"
                        >
                          Continue
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {!isLoading && step === 6 && (
                    <motion.div
                      key="step6"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                    >
                      <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <Leaf className="text-primary" /> Dietary Restrictions
                      </h2>
                      <p className="text-slate-500 mb-8">Do you have any specific dietary needs?</p>
                      <div className="grid grid-cols-2 gap-4">
                        {DIETARY_RESTRICTIONS.map(restriction => (
                          <button
                            key={restriction}
                            onClick={() => toggleSelection('dietaryRestrictions', restriction)}
                            className={`p-4 rounded-2xl border-2 text-left transition-all ${
                              formData.dietaryRestrictions.includes(restriction)
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{restriction}</span>
                              {formData.dietaryRestrictions.includes(restriction) && <CheckCircle2 className="w-5 h-5" />}
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-4 mt-12">
                        <button onClick={handleBack} className="px-8 py-4 rounded-full font-medium border border-slate-200">Back</button>
                        <div className="flex-grow flex flex-col gap-2">
                          <button 
                            onClick={handleSubmit} 
                            disabled={!isStepValid() || isLoading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                          >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate My Plan'}
                          </button>
                          {emailError && (
                            <p className="text-sm text-red-500 text-center">{emailError}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {!isLoading && step === 7 && results && (
                    <motion.div
                      key="step7"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full mx-auto"
                    >
                      <div className="text-center mb-12">
                        <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-8">
                          <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-display font-bold mb-4">Your Custom Meal Plan is Ready!</h2>
                        <p className="text-slate-600 mb-8 text-base sm:text-lg">
                          Based on your profile, our AI curated these 3 meals to support your health.
                        </p>
                      </div>

                      <div className="flex flex-col gap-6 mb-12">
                        {results.map((meal, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white rounded-3xl border border-slate-100 shadow-lg overflow-hidden"
                          >
                            <button
                              onClick={() => setExpandedMealIndex(expandedMealIndex === i ? null : i)}
                              className="w-full px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-center gap-4 sm:gap-6">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex-shrink-0">
                                  <img 
                                    src={`https://picsum.photos/seed/${encodeURIComponent(meal.title)}/300/300`} 
                                    alt={meal.title}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div>
                                  <h3 className="text-lg sm:text-2xl font-bold text-slate-900 leading-tight">{meal.title}</h3>
                                  <p className="text-sm sm:text-lg text-slate-500 line-clamp-1">{meal.description}</p>
                                </div>
                              </div>
                              {expandedMealIndex === i ? <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" /> : <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />}
                            </button>

                            <AnimatePresence>
                              {expandedMealIndex === i && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-4 sm:px-8 pb-6 sm:pb-8 pt-2 grid md:grid-cols-2 gap-8 sm:gap-12 border-t border-slate-50">
                                    <div className="space-y-8">
                                      <div>
                                        <h4 className="flex items-center gap-2 font-bold text-primary mb-4 uppercase tracking-wider text-sm">
                                          <Sparkles className="w-4 h-4" /> Why It Works For You
                                        </h4>
                                        <p className="text-slate-600 leading-relaxed bg-primary/5 p-4 rounded-2xl border border-primary/10">
                                          {meal.benefits}
                                        </p>
                                      </div>
                                      
                                      {meal.nutrition && (
                                        <div>
                                          <h4 className="flex items-center gap-2 font-bold text-slate-900 mb-4 uppercase tracking-wider text-sm">
                                            <Scale className="w-4 h-4" /> Nutritional Information
                                          </h4>
                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col items-center">
                                              <span className="text-[10px] font-bold text-slate-400 uppercase">Calories</span>
                                              <span className="text-sm font-bold text-slate-700">{meal.nutrition.calories}</span>
                                            </div>
                                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col items-center">
                                              <span className="text-[10px] font-bold text-slate-400 uppercase">Protein</span>
                                              <span className="text-sm font-bold text-slate-700">{meal.nutrition.protein}g</span>
                                            </div>
                                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col items-center">
                                              <span className="text-[10px] font-bold text-slate-400 uppercase">Carbs</span>
                                              <span className="text-sm font-bold text-slate-700">{meal.nutrition.carbs}g</span>
                                            </div>
                                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col items-center">
                                              <span className="text-[10px] font-bold text-slate-400 uppercase">Fats</span>
                                              <span className="text-sm font-bold text-slate-700">{meal.nutrition.fats}g</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      <div>
                                        <h4 className="flex items-center gap-2 font-bold text-slate-900 mb-4 uppercase tracking-wider text-sm">
                                          <Utensils className="w-4 h-4" /> Ingredients (1 Serving)
                                        </h4>
                                        <div className="space-y-3">
                                          {meal.ingredients.map((ing, j) => (
                                            <div key={j} className="flex justify-between items-center py-2 border-b border-slate-50">
                                              <span className="text-slate-700">{ing.name}</span>
                                              <span className="font-bold text-slate-400">{ing.amount} {ing.unit}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="flex items-center gap-2 font-bold text-slate-900 mb-4 uppercase tracking-wider text-sm">
                                        <Activity className="w-4 h-4" /> Instructions
                                      </h4>
                                      <div className="space-y-4">
                                        {meal.instructions.map((step, k) => (
                                          <div key={k} className="flex gap-4">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 font-bold text-slate-500 text-sm">
                                              {k + 1}
                                            </div>
                                            <p className="text-slate-600 pt-1">{step}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        ))}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <button 
                          onClick={handleSavePDF}
                          className="btn-primary flex items-center gap-2 w-full sm:w-auto"
                        >
                          <Download className="w-5 h-5" /> Save my meal plan (PDF)
                        </button>
                        <button 
                          onClick={handleSendEmail}
                          disabled={isEmailLoading || isEmailSent}
                          className={`btn-primary flex items-center gap-2 w-full sm:w-auto transition-all ${isEmailSent ? 'bg-green-600' : ''}`}
                        >
                          {isEmailLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : isEmailSent ? (
                            <>
                              <CheckCircle2 className="w-5 h-5" /> Email Sent!
                            </>
                          ) : (
                            <>
                              <Send className="w-5 h-5" /> Email my plan
                            </>
                          )}
                        </button>
                        <button 
                          onClick={() => {
                            setStep(1);
                            setResults(null);
                            setIsEmailSent(false);
                            setEmailError(null);
                          }}
                          className="px-8 py-4 rounded-full font-medium border border-slate-200 hover:bg-slate-50 transition-colors w-full sm:w-auto"
                        >
                          Start Over
                        </button>
                      </div>
                      {emailError && (
                        <p className="mt-4 text-red-500 text-center font-medium">{emailError}</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white pt-[68px] pb-[30px] mb-0 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 pb-0">
          <div className="md:col-span-2 text-center md:text-left flex flex-col items-center md:items-start">
            <div className="flex flex-col items-center md:items-start leading-none select-none mb-8">
              <span className="text-2xl font-bold tracking-tight text-white uppercase font-sans" style={{ letterSpacing: '0.02em' }}>Harness</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xl font-normal tracking-tight text-white uppercase font-sans" style={{ letterSpacing: '0.02em' }}>Foods</span>
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                  <Utensils className="text-slate-900 w-3 h-3" />
                </div>
              </div>
            </div>
            <p className="text-slate-400 max-w-sm mb-8">
              Meal prep designed for chronic illness management and prevention. Just heat and eat!
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors cursor-pointer text-white">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors cursor-pointer text-white">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors cursor-pointer text-white">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div className="text-center md:text-left">
            <h4 className="font-bold mb-6">Company</h4>
            <ul className="space-y-4 text-slate-400">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

          <div className="text-center md:text-left">
            <h4 className="font-bold mb-6">Legal</h4>
            <ul className="space-y-4 text-slate-400">
              <li>
                <button 
                  onClick={() => setIsDisclaimerOpen(true)}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Medical Disclaimer
                </button>
              </li>
            </ul>
          </div>
        </div>
      </footer>

      {/* Medical Disclaimer Popup */}
      <AnimatePresence>
        {isDisclaimerOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDisclaimerOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Info className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Medical Disclaimer</h3>
              <p className="text-slate-600 leading-relaxed mb-8">
                Please consult your physician or dietician before making drastic changes to your diet.
              </p>
              <button
                onClick={() => setIsDisclaimerOpen(false)}
                className="w-full btn-primary"
              >
                Got it, thanks
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
