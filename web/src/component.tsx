import React, { useState, useEffect, useRef } from "react";
import {
  Check,
  ChevronDown,
  Target,
  TrendingUp,
  Minus,
  Plus,
  Mail,
  X,
  RefreshCw,
  Heart,
  MessageSquare,
  Printer
} from "lucide-react";
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

const COLORS = {
  primary: "#56C596", // Mint Green
  primaryDark: "#3aa87b",
  bg: "#FAFAFA",
  card: "#FFFFFF",
  textMain: "#1A1A1A",
  textSecondary: "#9CA3AF",
  border: "#F3F4F6",
  inputBg: "#F9FAFB",
  accentLight: "#E6F7F0",
  blue: "#5D9CEC",
  yellow: "#F59E0B",
  red: "#FF6B6B",
  orange: "#F2994A",
  orangeLight: "#FFF7ED",
  saveGreen: "#4D7C0F",
  tableHeader: "#2563EB"
};

interface CalculatorValues {
  goal: "target" | "future";
  targetAmount: string;
  currentBalance: string;
  monthlyContribution: string;
  timeHorizon: string;
  investmentStrategy: "conservative" | "moderate" | "aggressive";
  solveFor: "contribution" | "time" | "rate" | "current";
}

const STRATEGY_RATES: Record<string, number> = {
  conservative: 3,
  moderate: 6,
  aggressive: 9
};

interface CalculatorData {
  values: CalculatorValues;
  result: any | null;
}

const NumberControl = ({ 
  value, 
  onChange, 
  min = 0, 
  max = 10000000, 
  step = 1, 
  label,
  suffix,
  prefix
}: {
  value: string;
  onChange: (val: string) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  suffix?: string;
  prefix?: string;
}) => {
  const handleDec = () => {
    const num = parseFloat(value) || 0;
    if (num - step >= min) onChange(Math.round((num - step) * 100) / 100 + "");
  };

  const handleInc = () => {
    const num = parseFloat(value) || 0;
    if (num + step <= max) onChange(Math.round((num + step) * 100) / 100 + "");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, ''); 
    const val = raw.replace(/[^0-9.]/g, '');
    onChange(val);
  };

  const btnStyle = {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "white",
    color: COLORS.primary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
  };

  return (
    <div style={{
      backgroundColor: COLORS.inputBg,
      borderRadius: "12px",
      padding: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      height: "44px"
    }}>
      <button onClick={handleDec} style={btnStyle}><Minus size={16} strokeWidth={3} /></button>
      
      <div style={{flex: 1, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px"}}>
          {prefix && <span style={{fontSize: "16px", fontWeight: 700, color: COLORS.textMain}}>{prefix}</span>}
          <input 
            type="text" 
            value={value ? Number(value).toLocaleString() : ""} 
            onChange={handleChange}
            style={{
              width: "100%", 
              border: "none", 
              background: "transparent", 
              textAlign: "center", 
              fontSize: "16px", 
              fontWeight: 700, 
              color: COLORS.textMain,
              outline: "none"
            }}
          />
          {suffix && <span style={{fontSize: "14px", color: COLORS.textSecondary, fontWeight: 500}}>{suffix}</span>}
      </div>

      <button onClick={handleInc} style={btnStyle}><Plus size={16} strokeWidth={3} /></button>
    </div>
  );
};

const DEFAULT_VALUES: CalculatorValues = {
  goal: "target",
  targetAmount: "1000000",
  currentBalance: "10000",
  monthlyContribution: "500",
  timeHorizon: "20",
  investmentStrategy: "moderate",
  solveFor: "contribution"
};

const STORAGE_KEY = "investment-calculator-values";
const STORAGE_EXPIRY_HOURS = 72;

// Load saved values from localStorage
const loadSavedValues = (): CalculatorValues | null => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return null;
        
        const parsed = JSON.parse(saved);
        const savedAt = parsed._savedAt;
        
        // Check if expired (72 hours)
        if (savedAt) {
            const hoursSinceSave = (Date.now() - savedAt) / (1000 * 60 * 60);
            if (hoursSinceSave > STORAGE_EXPIRY_HOURS) {
                localStorage.removeItem(STORAGE_KEY);
                return null;
            }
        }
        
        // Return values without the _savedAt field
        const { _savedAt, ...values } = parsed;
        return values as CalculatorValues;
    } catch (e) {
        return null;
    }
};

// Save values to localStorage
const saveValues = (values: CalculatorValues) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            ...values,
            _savedAt: Date.now()
        }));
    } catch (e) {
        console.error("Failed to save values", e);
    }
};

// Clear saved values
const clearSavedValues = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.error("Failed to clear values", e);
    }
};

// Helper to solve for Rate (Binary Search)
const solveForRate = (nYears: number, pv: number, pmt: number, fv: number): number => {
    let low = 0.0001;
    let high = 1.0; // 100%
    let mid = 0.05;
    
    const n = nYears * 12;
    
    for(let i=0; i<50; i++) {
        mid = (low + high) / 2;
        const r = mid / 12;
        const val = pv * Math.pow(1+r, n) + pmt * (Math.pow(1+r, n) - 1) / r;
        
        if (Math.abs(val - fv) < 1) return mid;
        if (val > fv) {
            high = mid;
        } else {
            low = mid;
        }
    }
    return mid;
};

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:8001' 
  : 'https://investment-calculator-1a2t.onrender.com';

export default function InvestmentCalculator({ initialData }: { initialData?: any }) {
  // Load saved values from localStorage or use defaults
  const [values, setValues] = useState<CalculatorValues>(() => {
      const saved = loadSavedValues();
      return saved || DEFAULT_VALUES;
  });
  const [result, setResult] = useState<any>(null);

  // Save values to localStorage whenever they change
  useEffect(() => {
      saveValues(values);
  }, [values]);
  
  // Subscribe banner state
  const [showSubscribeBanner, setShowSubscribeBanner] = useState(true);
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [subscribeMessage, setSubscribeMessage] = useState("");
  
  const turnstileRef = useRef<HTMLDivElement>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  
  // Modal states
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    if (showSubscribeModal && turnstileRef.current && (window as any).turnstile) {
        // cleanup previous
        const widgetId = turnstileRef.current.getAttribute("data-turnstile-id");
        if (widgetId) (window as any).turnstile.remove(widgetId);

        try {
            (window as any).turnstile.render(turnstileRef.current, {
                sitekey: (window as any).TURNSTILE_SITE_KEY,
                callback: (token: string) => setTurnstileToken(token),
                appearance: 'interaction-only'
            });
        } catch (e) {
            console.error("Turnstile render error", e);
        }
    }
  }, [showSubscribeModal]);

  const handleSubscribe = async () => {
    if (!subscribeEmail || !subscribeEmail.includes("@")) {
      setSubscribeStatus("error");
      setSubscribeMessage("Please enter a valid email address");
      return;
    }
    
    if (!turnstileToken) {
        setSubscribeStatus("error");
        setSubscribeMessage("Please verify you are human");
        return;
    }

    setSubscribeStatus("loading");
    try {
      const response = await fetch(`${API_BASE}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: subscribeEmail,
          topicId: "investment-calculator",
          topicName: "Investment Calculator Tips",
          turnstileToken
        })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        setSubscribeStatus("success");
        setSubscribeMessage(data.message || "Successfully subscribed!");
        setTimeout(() => {
            setShowSubscribeModal(false);
            setSubscribeStatus("idle");
            setSubscribeEmail("");
        }, 2000);
      } else {
        setSubscribeStatus("error");
        setSubscribeMessage(data.error || "Failed to subscribe");
      }
    } catch (err) {
      setSubscribeStatus("error");
      setSubscribeMessage("Failed to subscribe. Please try again.");
    }
  };

  const handleFeedback = async () => {
    if (!feedbackText.trim()) {
      setFeedbackStatus("error");
      return;
    }
    
    setFeedbackStatus("loading");
    try {
      const response = await fetch(`${API_BASE}/api/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "widget_user_feedback",
          data: { feedback: feedbackText, source: "investment-calculator" }
        })
      });
      
      if (response.ok) {
        setFeedbackStatus("success");
        setTimeout(() => {
            setShowFeedbackModal(false);
            setFeedbackStatus("idle");
            setFeedbackText("");
        }, 1500);
      } else {
        setFeedbackStatus("error");
      }
    } catch (err) {
      setFeedbackStatus("error");
    }
  };

  const updateVal = (field: keyof CalculatorValues, val: string) => {
    setValues(prev => ({ ...prev, [field]: val }));
  };

  useEffect(() => {
    if (initialData) {
        // Basic hydration if relevant fields exist
        const newValues = { ...values };
        if (initialData.current_balance) newValues.currentBalance = String(initialData.current_balance);
        if (initialData.monthly_contribution) newValues.monthlyContribution = String(initialData.monthly_contribution);
        if (initialData.target_amount) newValues.targetAmount = String(initialData.target_amount);
        setValues(newValues);
    }
  }, [initialData]);

  useEffect(() => {
    const { goal, targetAmount, currentBalance, monthlyContribution, timeHorizon, investmentStrategy, solveFor } = values;
    
    const target = parseFloat(targetAmount) || 0;
    const current = parseFloat(currentBalance) || 0;
    const monthly = parseFloat(monthlyContribution) || 0;
    const years = parseFloat(timeHorizon) || 0;
    const rate = STRATEGY_RATES[investmentStrategy] || 6;

    let mainValue = 0;
    let breakdown = { starting: current, totalContrib: 0, totalGrowth: 0 };

    if (goal === "future") {
        // Solve for Future Balance
        const r = (rate / 100) / 12;
        const n = years * 12;
        // FV = PV*(1+r)^n + PMT*(((1+r)^n - 1)/r)
        const fv = current * Math.pow(1 + r, n) + monthly * (Math.pow(1 + r, n) - 1) / r;
        mainValue = fv;
        
        breakdown.totalContrib = monthly * n;
        breakdown.totalGrowth = Math.max(0, fv - current - breakdown.totalContrib);
        
    } else {
        // Goal: Reach Target
        if (solveFor === "contribution") {
            const r = (rate / 100) / 12;
            const n = years * 12;
            // PMT = (FV - PV*(1+r)^n) * r / ((1+r)^n - 1)
            const numerator = (target - current * Math.pow(1 + r, n)) * r;
            const denominator = Math.pow(1 + r, n) - 1;
            const pmt = denominator !== 0 ? numerator / denominator : 0;
            mainValue = Math.max(0, pmt);
            
            breakdown.starting = current;
            breakdown.totalContrib = mainValue * n;
            breakdown.totalGrowth = Math.max(0, target - current - breakdown.totalContrib);
            
        } else if (solveFor === "current") {
            // Solve for PV
            const r = (rate / 100) / 12;
            const n = years * 12;
            // PV = (FV - PMT * ((1+r)^n - 1)/r) / (1+r)^n
            const fvOfPmt = monthly * (Math.pow(1 + r, n) - 1) / r;
            const pv = (target - fvOfPmt) / Math.pow(1 + r, n);
            mainValue = Math.max(0, pv);
            
            breakdown.starting = mainValue;
            breakdown.totalContrib = monthly * n;
            breakdown.totalGrowth = Math.max(0, target - breakdown.starting - breakdown.totalContrib);
            
        } else if (solveFor === "time") {
             // Solve for n (years)
             const r = (rate / 100) / 12;
             // n = ln( (FV * r + PMT) / (PV * r + PMT) ) / ln(1+r)
             const num = target * r + monthly;
             const den = current * r + monthly;
             if (num > 0 && den > 0) {
                 const nMonths = Math.log(num / den) / Math.log(1 + r);
                 mainValue = Math.max(0, nMonths / 12);
             } else {
                 mainValue = 0;
             }
             
             breakdown.starting = current;
             breakdown.totalContrib = monthly * (mainValue * 12);
             breakdown.totalGrowth = Math.max(0, target - current - breakdown.totalContrib);

        } else if (solveFor === "rate") {
            // Solve for Rate
            const r = solveForRate(years, current, monthly, target);
            mainValue = r * 100; // Percentage
            
             breakdown.starting = current;
             breakdown.totalContrib = monthly * (years * 12);
             breakdown.totalGrowth = Math.max(0, target - current - breakdown.totalContrib);
        }
    }

    // Generate year-by-year chart data
    const chartData: any[] = [];
    // Only use solved values when in "target" mode
    const effectiveYears = (goal === "target" && solveFor === "time") ? Math.ceil(mainValue) : years;
    const effectiveMonthly = (goal === "target" && solveFor === "contribution") ? mainValue : monthly;
    const effectiveStarting = (goal === "target" && solveFor === "current") ? mainValue : current;
    const effectiveRate = (goal === "target" && solveFor === "rate") ? mainValue : rate;
    
    let runningBalance = effectiveStarting;
    let totalContributions = 0;
    
    for (let year = 0; year <= Math.min(effectiveYears, 50); year++) {
        const startingPortion = effectiveStarting;
        const contributionsPortion = totalContributions;
        const growthPortion = Math.max(0, runningBalance - startingPortion - contributionsPortion);
        
        chartData.push({
            year: year,
            starting: Math.round(startingPortion),
            contributions: Math.round(contributionsPortion),
            growth: Math.round(growthPortion),
            total: Math.round(runningBalance)
        });
        
        // Calculate next year
        const monthlyRate = (effectiveRate / 100) / 12;
        for (let month = 0; month < 12; month++) {
            runningBalance = runningBalance * (1 + monthlyRate) + effectiveMonthly;
            totalContributions += effectiveMonthly;
        }
    }

    setResult({
        mainValue,
        breakdown,
        chartData
    });

  }, [values]);

  const styles = {
    container: {
      width: "100%",
      maxWidth: "600px",
      margin: "0 auto",
      backgroundColor: COLORS.bg,
      fontFamily: "'Inter', sans-serif",
      padding: "20px",
      boxSizing: "border-box" as const
    },
    title: {
      fontSize: "28px",
      fontWeight: 800,
      color: COLORS.textMain,
      marginBottom: "8px",
      textAlign: "left" as const,
      letterSpacing: "-0.5px"
    },
    subtitle: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        color: COLORS.textSecondary,
        fontSize: "14px",
        fontWeight: 500,
        marginBottom: "20px"
    },
    subscribeBanner: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: COLORS.accentLight,
        borderRadius: "12px",
        padding: "12px 16px",
        marginBottom: "24px",
        position: "relative" as const
    },
    subscribeText: {
        fontSize: "14px",
        fontWeight: 500,
        color: COLORS.textMain,
        flex: 1
    },
    subscribeBtn: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        backgroundColor: COLORS.primary,
        color: "white",
        border: "none",
        borderRadius: "20px",
        padding: "8px 20px",
        fontSize: "14px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "background-color 0.2s"
    },
    closeBtn: {
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "4px",
        marginLeft: "12px",
        color: COLORS.textSecondary,
        display: "flex",
        alignItems: "center"
    },
    card: {
      backgroundColor: COLORS.card,
      borderRadius: "24px",
      padding: "24px",
      boxShadow: "0 10px 40px -10px rgba(0,0,0,0.08)",
      marginBottom: "20px"
    },
    label: {
      fontWeight: 600,
      color: COLORS.textMain,
      fontSize: "14px",
      marginBottom: "8px",
      display: "block"
    },
    modeBtn: (active: boolean) => ({
        flex: 1,
        padding: "16px",
        borderRadius: "16px",
        border: active ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
        backgroundColor: active ? COLORS.accentLight : "white",
        color: active ? COLORS.primaryDark : COLORS.textSecondary,
        fontWeight: 700,
        fontSize: "14px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        gap: "8px",
        transition: "all 0.2s"
    }),
    grid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "16px",
        marginBottom: "24px"
    },
    solveForContainer: {
        marginTop: "24px",
        marginBottom: "24px",
        padding: "16px",
        backgroundColor: COLORS.inputBg,
        borderRadius: "16px"
    },
    solveForOption: (active: boolean) => ({
        padding: "10px 16px",
        borderRadius: "12px",
        cursor: "pointer",
        backgroundColor: active ? COLORS.blue : "transparent",
        color: active ? "white" : COLORS.textSecondary,
        fontWeight: 600,
        fontSize: "13px",
        marginBottom: "4px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
    }),
    resultBig: {
        fontSize: "42px",
        fontWeight: 800,
        color: COLORS.primary,
        marginBottom: "16px",
        textAlign: "center" as const
    },
    resultLabel: {
        fontSize: "14px",
        color: COLORS.textSecondary,
        textAlign: "center" as const,
        fontWeight: 500,
        marginBottom: "16px"
    },
    legendItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
        borderBottom: `1px dashed ${COLORS.border}`,
        fontSize: "13px",
        color: COLORS.textMain
    },
    calculatedInput: {
        backgroundColor: COLORS.inputBg,
        borderRadius: "12px",
        padding: "6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        height: "44px",
        boxSizing: "border-box" as const,
        color: COLORS.textSecondary,
        fontSize: "16px",
        fontWeight: 700,
        cursor: "not-allowed"
    },
    strategyBtn: (active: boolean) => ({
        flex: 1,
        padding: "12px 8px",
        borderRadius: "12px",
        border: active ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
        backgroundColor: active ? COLORS.accentLight : "white",
        color: active ? COLORS.primaryDark : COLORS.textSecondary,
        fontWeight: 600,
        fontSize: "13px",
        cursor: "pointer",
        textAlign: "center" as const,
        transition: "all 0.2s"
    }),
    actionsContainer: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        marginTop: "32px",
        paddingTop: "24px",
        borderTop: `1px solid ${COLORS.border}`,
        gap: "24px",
        flexWrap: "wrap" as const
    },
    actionBtn: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        background: "none",
        border: "none",
        color: COLORS.textSecondary,
        fontSize: "14px",
        fontWeight: 600,
        cursor: "pointer",
        padding: "8px",
        borderRadius: "8px",
        transition: "color 0.2s",
        fontFamily: "inherit"
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        .action-btn:hover {
            opacity: 0.8;
            transform: scale(1.05);
            background-color: rgba(0,0,0,0.05) !important;
        }
        .action-btn:active {
            transform: scale(0.95);
        }
        @media print {
            body { background-color: white; }
            .action-btn, button { display: none !important; }
            /* Hide subscribe banner */
            div[style*="backgroundColor: #E0F2FE"] { display: none !important; } 
            /* Reset container width */
            div[style*="maxWidth: 600px"] { max-width: none !important; width: 100% !important; }
        }
      `}</style>
      <div style={styles.title}>The Investment Growth Strategist</div>
      <div style={styles.subtitle}>
        <Check size={16} color={COLORS.primary} strokeWidth={3} />
        Aligned with Modern Portfolio Theory principles
      </div>
      
      {/* Subscribe Banner */}
      {showSubscribeBanner && (
        <div style={styles.subscribeBanner}>
          <span style={styles.subscribeText}>Want expert tips to grow your investments faster?</span>
          <button 
            style={styles.subscribeBtn}
            onClick={() => {
                setShowSubscribeBanner(false);
                setShowSubscribeModal(true);
            }}
          >
            <Mail size={16} />
            Subscribe
          </button>
          <button 
            style={styles.closeBtn}
            onClick={() => setShowSubscribeBanner(false)}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Subscribe Modal */}
      {showSubscribeModal && (
        <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
        }}>
          <div style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "24px",
              width: "90%",
              maxWidth: "400px",
              position: "relative"
          }}>
            <button 
                style={{...styles.closeBtn, position: "absolute", top: "12px", right: "12px"}}
                onClick={() => {
                    setShowSubscribeModal(false);
                    setSubscribeStatus("idle");
                    setSubscribeEmail("");
                }}
            >
                <X size={18} />
            </button>
            
            <h3 style={{margin: "0 0 8px 0", color: COLORS.textMain}}>Subscribe for Tips</h3>
            <p style={{margin: "0 0 16px 0", color: COLORS.textSecondary, fontSize: "14px"}}>
                Get expert investment tips and strategies delivered to your inbox.
            </p>
            
            {subscribeStatus === "success" ? (
                <div style={{color: COLORS.primary, fontWeight: 600, textAlign: "center", padding: "20px 0"}}>
                    {subscribeMessage}
                </div>
            ) : (
                <>
                    <input 
                        type="email" 
                        placeholder="Enter your email" 
                        value={subscribeEmail}
                        onChange={(e) => setSubscribeEmail(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "8px",
                            border: `1px solid ${COLORS.border}`,
                            fontSize: "14px",
                            marginBottom: "12px",
                            boxSizing: "border-box"
                        }}
                    />
                    <div ref={turnstileRef} style={{marginBottom: "12px"}}></div>
                    {subscribeStatus === "error" && (
                        <div style={{color: "#DC2626", fontSize: "13px", marginBottom: "12px"}}>
                            {subscribeMessage || "Please try again"}
                        </div>
                    )}
                    <button 
                        style={{...styles.subscribeBtn, width: "100%", justifyContent: "center"}}
                        onClick={handleSubscribe}
                        disabled={subscribeStatus === "loading"}
                    >
                        {subscribeStatus === "loading" ? "Subscribing..." : "Subscribe"}
                    </button>
                </>
            )}
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
        }}>
          <div style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "24px",
              width: "90%",
              maxWidth: "400px",
              position: "relative"
          }}>
            <button 
                style={{...styles.closeBtn, position: "absolute", top: "12px", right: "12px"}}
                onClick={() => {
                    setShowFeedbackModal(false);
                    setFeedbackStatus("idle");
                    setFeedbackText("");
                }}
            >
                <X size={18} />
            </button>
            
            <h3 style={{margin: "0 0 8px 0", color: COLORS.textMain}}>Share Your Feedback</h3>
            <p style={{margin: "0 0 16px 0", color: COLORS.textSecondary, fontSize: "14px"}}>
                Help us improve the Investment Calculator.
            </p>
            
            {feedbackStatus === "success" ? (
                <div style={{color: COLORS.primary, fontWeight: 600, textAlign: "center", padding: "20px 0"}}>
                    Thank you for your feedback!
                </div>
            ) : (
                <>
                    <textarea 
                        placeholder="What can we do better?" 
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "8px",
                            border: `1px solid ${COLORS.border}`,
                            fontSize: "14px",
                            marginBottom: "12px",
                            boxSizing: "border-box",
                            minHeight: "100px",
                            resize: "vertical",
                            fontFamily: "inherit"
                        }}
                    />
                    {feedbackStatus === "error" && (
                        <div style={{color: "#DC2626", fontSize: "13px", marginBottom: "12px"}}>
                            Please enter some feedback
                        </div>
                    )}
                    <button 
                        style={{...styles.subscribeBtn, width: "100%", justifyContent: "center"}}
                        onClick={handleFeedback}
                        disabled={feedbackStatus === "loading"}
                    >
                        {feedbackStatus === "loading" ? "Sending..." : "Send Feedback"}
                    </button>
                </>
            )}
          </div>
        </div>
      )}
      
      {/* Goal Selection */}
      <div style={{display: "flex", gap: "12px", marginBottom: "24px"}}>
        <div style={styles.modeBtn(values.goal === "target")} onClick={() => updateVal("goal", "target")}>
            <Target size={24} />
            Reach a Target
        </div>
        <div style={styles.modeBtn(values.goal === "future")} onClick={() => updateVal("goal", "future")}>
            <TrendingUp size={24} />
            See Future Growth
        </div>
      </div>

      <div style={styles.card}>
        {values.goal === "target" && (
            <div style={{marginBottom: "24px"}}>
                <label style={styles.label}>Target Amount</label>
                <NumberControl 
                    value={values.targetAmount}
                    onChange={(v) => updateVal("targetAmount", v)}
                    prefix="$"
                    step={1000}
                    max={100000000}
                />
            </div>
        )}

        {/* Solve For - Now positioned right after Target */}
        {values.goal === "target" && (
            <div style={styles.solveForContainer}>
                <div style={{fontSize: "14px", fontWeight: 700, color: COLORS.textMain, marginBottom: "12px"}}>What do you need help calculating?</div>
                
                <div style={styles.solveForOption(values.solveFor === "contribution")} onClick={() => updateVal("solveFor", "contribution")}>
                    <span>How much do I need to save monthly to reach my goal</span>
                    {values.solveFor === "contribution" && <Check size={16} />}
                </div>
                <div style={styles.solveForOption(values.solveFor === "time")} onClick={() => updateVal("solveFor", "time")}>
                    <span>How long it will take to reach my goal</span>
                    {values.solveFor === "time" && <Check size={16} />}
                </div>
                <div style={styles.solveForOption(values.solveFor === "rate")} onClick={() => updateVal("solveFor", "rate")}>
                    <span>What return I need to reach my goal</span>
                    {values.solveFor === "rate" && <Check size={16} />}
                </div>
                <div style={styles.solveForOption(values.solveFor === "current")} onClick={() => updateVal("solveFor", "current")}>
                    <span>How much do I need to start with</span>
                    {values.solveFor === "current" && <Check size={16} />}
                </div>
            </div>
        )}

        <div style={styles.grid}>
            {/* Current Balance */}
            <div>
                <label style={styles.label}>Current Balance</label>
                {values.goal === "target" && values.solveFor === "current" ? (
                    <div 
                        style={styles.calculatedInput}
                        title="This result is being calculated, you cannot modify it. Change your selection above if you want to modify this input."
                    >
                        <span style={{color: COLORS.textSecondary}}>$</span>
                        <span style={{fontWeight: 700}}>{result ? Math.round(result.mainValue).toLocaleString() : "—"}</span>
                    </div>
                ) : (
                    <NumberControl 
                        value={values.currentBalance}
                        onChange={(v) => updateVal("currentBalance", v)}
                        prefix="$"
                    />
                )}
            </div>

            {/* Monthly Contribution */}
             <div>
                <label style={styles.label}>Monthly Contribution</label>
                {values.goal === "target" && values.solveFor === "contribution" ? (
                    <div 
                        style={styles.calculatedInput}
                        title="This result is being calculated, you cannot modify it. Change your selection above if you want to modify this input."
                    >
                        <span style={{color: COLORS.textSecondary}}>$</span>
                        <span style={{fontWeight: 700}}>{result ? Math.round(result.mainValue).toLocaleString() : "—"}</span>
                    </div>
                ) : (
                    <NumberControl 
                        value={values.monthlyContribution}
                        onChange={(v) => updateVal("monthlyContribution", v)}
                        prefix="$"
                    />
                )}
            </div>

            {/* Time Horizon */}
             <div>
                <label style={styles.label}>Time Horizon</label>
                {values.goal === "target" && values.solveFor === "time" ? (
                    <div 
                        style={styles.calculatedInput}
                        title="This result is being calculated, you cannot modify it. Change your selection above if you want to modify this input."
                    >
                        <span style={{fontWeight: 700}}>{result ? result.mainValue.toFixed(1) : "—"}</span>
                        <span style={{color: COLORS.textSecondary, fontSize: "14px"}}>years</span>
                    </div>
                ) : (
                    <NumberControl 
                        value={values.timeHorizon}
                        onChange={(v) => updateVal("timeHorizon", v)}
                        suffix="years"
                        max={100}
                    />
                )}
            </div>

            {/* Investment Strategy */}
             <div style={{gridColumn: "1 / -1"}}>
                <label style={styles.label}>Investment Strategy</label>
                {values.goal === "target" && values.solveFor === "rate" ? (
                    <div 
                        style={styles.calculatedInput}
                        title="This result is being calculated, you cannot modify it. Change your selection above if you want to modify this input."
                    >
                        <span style={{fontWeight: 700}}>{result ? result.mainValue.toFixed(2) : "—"}</span>
                        <span style={{color: COLORS.textSecondary, fontSize: "14px"}}>% annual return needed</span>
                    </div>
                ) : (
                    <div style={{display: "flex", gap: "8px"}}>
                        <div 
                            style={styles.strategyBtn(values.investmentStrategy === "conservative")} 
                            onClick={() => updateVal("investmentStrategy", "conservative")}
                        >
                            <div>Conservative</div>
                            <div style={{fontSize: "11px", fontWeight: 400, marginTop: "2px", opacity: 0.7}}>Bonds & Stability</div>
                        </div>
                        <div 
                            style={styles.strategyBtn(values.investmentStrategy === "moderate")} 
                            onClick={() => updateVal("investmentStrategy", "moderate")}
                        >
                            <div>Moderate</div>
                            <div style={{fontSize: "11px", fontWeight: 400, marginTop: "2px", opacity: 0.7}}>Balanced Growth</div>
                        </div>
                        <div 
                            style={styles.strategyBtn(values.investmentStrategy === "aggressive")} 
                            onClick={() => updateVal("investmentStrategy", "aggressive")}
                        >
                            <div>Aggressive</div>
                            <div style={{fontSize: "11px", fontWeight: 400, marginTop: "2px", opacity: 0.7}}>Max Returns</div>
                        </div>
                    </div>
                )}
            </div>
        </div>

      </div>

      {/* Results */}
      {result && (() => {
          const target = parseFloat(values.targetAmount) || 0;
          const current = parseFloat(values.currentBalance) || 0;
          const monthly = parseFloat(values.monthlyContribution) || 0;
          const years = parseFloat(values.timeHorizon) || 0;
          const strategyName = values.investmentStrategy === "conservative" ? "conservative" : 
                               values.investmentStrategy === "aggressive" ? "aggressive" : "moderate";
          
          const getResultHeader = () => {
              if (values.goal === "future") return "Projected Future Balance";
              switch (values.solveFor) {
                  case "contribution": return "Required Monthly Savings";
                  case "time": return "Time to Reach Your Goal";
                  case "rate": return "Required Annual Return";
                  case "current": return "Required Starting Balance";
                  default: return "Result";
              }
          };
          
          const getResultSubtext = () => {
              const mainVal = result.mainValue;
              if (values.goal === "future") {
                  return `In ${years} years, your investment will grow to $${Math.round(mainVal).toLocaleString()}, starting with $${current.toLocaleString()}, saving $${monthly.toLocaleString()}/month in a ${strategyName} growth strategy.`;
              }
              switch (values.solveFor) {
                  case "contribution":
                      return `You'll need to save $${Math.round(mainVal).toLocaleString()}/month if your goal is $${target.toLocaleString()}, in ${years} years, starting with $${current.toLocaleString()} in a ${strategyName} growth strategy.`;
                  case "time":
                      return `It will take ${mainVal.toFixed(1)} years to reach $${target.toLocaleString()}, starting with $${current.toLocaleString()}, saving $${monthly.toLocaleString()}/month in a ${strategyName} growth strategy.`;
                  case "rate":
                      return `You'll need a ${mainVal.toFixed(2)}% annual return to reach $${target.toLocaleString()} in ${years} years, starting with $${current.toLocaleString()}, saving $${monthly.toLocaleString()}/month.`;
                  case "current":
                      return `You'll need to start with $${Math.round(mainVal).toLocaleString()} if your goal is $${target.toLocaleString()}, in ${years} years, with a monthly contribution of $${monthly.toLocaleString()} in a ${strategyName} growth strategy.`;
                  default:
                      return "";
              }
          };

          return (
          <div style={styles.card}>
              <div style={styles.resultLabel}>{getResultHeader()}</div>
              <div style={styles.resultBig}>
                  {values.solveFor === "rate" ? result.mainValue.toFixed(2) + "%" : 
                   values.solveFor === "time" ? result.mainValue.toFixed(1) + " Years" :
                   "$" + Math.round(result.mainValue).toLocaleString()}
              </div>
              <div style={{fontSize: "14px", color: COLORS.textSecondary, textAlign: "center" as const, lineHeight: 1.5, marginBottom: "16px"}}>
                  {getResultSubtext()}
              </div>

              <div style={{marginTop: "24px"}}>
                  {/* Legend - ordered to match visual (top of stack first) */}
                  <div style={{display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px"}}>
                      <div style={styles.legendItem}>
                          <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                              <div style={{width: "12px", height: "12px", borderRadius: "4px", backgroundColor: COLORS.primary}} />
                              Interest
                          </div>
                          <div style={{fontWeight: 700}}>${Math.round(result.breakdown.totalGrowth).toLocaleString()}</div>
                      </div>
                      <div style={styles.legendItem}>
                          <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                              <div style={{width: "12px", height: "12px", borderRadius: "4px", backgroundColor: COLORS.blue}} />
                              Contributions
                          </div>
                          <div style={{fontWeight: 700}}>${Math.round(result.breakdown.totalContrib).toLocaleString()}</div>
                      </div>
                      <div style={{...styles.legendItem, borderBottom: "none"}}>
                          <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                              <div style={{width: "12px", height: "12px", borderRadius: "4px", backgroundColor: COLORS.textSecondary}} />
                              Starting Amount
                          </div>
                          <div style={{fontWeight: 700}}>${result.breakdown.starting.toLocaleString()}</div>
                      </div>
                  </div>

                  {/* Stacked Bar Chart - stacking order: starting (bottom), contributions (middle), interest (top) */}
                  <div style={{height: "280px", width: "100%", marginTop: "16px"}}>
                      <ResponsiveContainer>
                          <BarChart data={result.chartData} margin={{top: 10, right: 10, left: 0, bottom: 20}}>
                              <XAxis 
                                  dataKey="year" 
                                  tick={{fontSize: 11, fill: COLORS.textSecondary}}
                                  axisLine={{stroke: COLORS.border}}
                                  tickLine={false}
                                  label={{value: "Year", position: "bottom", offset: 0, fontSize: 12, fill: COLORS.textSecondary}}
                              />
                              <YAxis 
                                  tick={{fontSize: 11, fill: COLORS.textSecondary}}
                                  axisLine={{stroke: COLORS.border}}
                                  tickLine={false}
                                  tickFormatter={(value) => value >= 1000000 ? `$${(value/1000000).toFixed(1)}M` : value >= 1000 ? `$${(value/1000).toFixed(0)}K` : `$${value}`}
                              />
                              <Tooltip 
                                  formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name === "starting" ? "Starting Amount" : name === "contributions" ? "Contributions" : "Interest"]}
                                  labelFormatter={(label) => `Year ${label}`}
                                  contentStyle={{borderRadius: "8px", border: `1px solid ${COLORS.border}`}}
                              />
                              <Bar dataKey="starting" stackId="a" fill={COLORS.textSecondary} radius={[0, 0, 0, 0]} />
                              <Bar dataKey="contributions" stackId="a" fill={COLORS.blue} radius={[0, 0, 0, 0]} />
                              <Bar dataKey="growth" stackId="a" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>
          );
      })()}

      <div style={styles.actionsContainer}>
        <button className="action-btn" style={styles.actionBtn} onClick={() => setShowSubscribeModal(true)}>
            <Mail size={16} />
            Subscribe
        </button>
        <button className="action-btn" style={styles.actionBtn} onClick={() => {
            clearSavedValues();
            setValues(DEFAULT_VALUES);
            setSubscribeStatus("idle");
            setSubscribeEmail("");
            setSubscribeMessage("");
        }}>
            <RefreshCw size={16} />
            Reset
        </button>
        <button className="action-btn" style={styles.actionBtn}>
            <Heart size={16} />
            Donate
        </button>
        <button className="action-btn" style={styles.actionBtn} onClick={() => setShowFeedbackModal(true)}>
            <MessageSquare size={16} />
            Feedback
        </button>
        <button className="action-btn" style={styles.actionBtn} onClick={() => window.print()}>
            <Printer size={16} />
            Print
        </button>
      </div>
    </div>
  );
}
