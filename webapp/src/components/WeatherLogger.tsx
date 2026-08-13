import React, { useState, useEffect } from 'react';
import { 
  CloudRain, 
  Sun, 
  Cloudy, 
  Snowflake, 
  Wind, 
  BrainCircuit, 
  Loader2, 
  TrendingUp, 
  AlertTriangle,
  History,
  FileText,
  Upload
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

interface WeatherLog {
  id: string;
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  timestamp: any;
}

interface WeatherLoggerProps {
  projectId: string;
  projectCoordinates?: { lat: number; lng: number };
}

export default function WeatherLogger({ projectId, projectCoordinates }: WeatherLoggerProps) {
  const [logs, setLogs] = useState<WeatherLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, `projects/${projectId}/weather_logs`), 
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      } as WeatherLog));
      setLogs(data);
      setLoading(false);

      // Check if we need to log new weather (Pulse)
      if (data.length === 0 || (new Date().getTime() - data[0].timestamp.getTime() > 3600000)) {
        logCurrentWeather();
      }
    });

    return unsubscribe;
  }, [projectId]);

  const logCurrentWeather = async () => {
    if (!projectCoordinates?.lat || !projectCoordinates?.lng) return;

    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${projectCoordinates.lat}&longitude=${projectCoordinates.lng}&current_weather=true&hourly=relative_humidity_2m`);
      if (res.ok) {
        const data = await res.json();
        const current = data.current_weather;
        
        await addDoc(collection(db, `projects/${projectId}/weather_logs`), {
          temp: current.temperature,
          condition: getWeatherDescription(current.weathercode),
          windSpeed: current.windspeed,
          humidity: data.hourly?.relative_humidity_2m?.[0] || 0,
          timestamp: serverTimestamp()
        });
      }
    } catch (e) {
      console.error("Pulse weather log failed", e);
    }
  };

  const getWeatherDescription = (code: number) => {
    if (code === 0) return 'Clear';
    if (code >= 1 && code <= 3) return 'Partly Cloudy';
    if (code >= 51 && code <= 67) return 'Rain';
    if (code >= 71 && code <= 86) return 'Snow';
    return 'Overcast';
  };

  const generateAiSummary = async () => {
    setIsSummarizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const logData = logs.slice(0, 24).map(l => ({
        time: l.timestamp.toLocaleTimeString(),
        temp: l.temp,
        condition: l.condition,
        wind: l.windSpeed,
        humidity: l.humidity
      }));

      const prompt = `Act as a Senior Site Engineer. Analyze the last 24 hours of site weather data for Project ${projectId}:
      ${JSON.stringify(logData)}
      
      Provide a "Weather Impact Report" focusing on:
      1. CRITICAL PATH IMPACTS: Identify specific delays to tower cranes (if wind > 40km/h), concrete works (if temp < 5°C or rain), and earthworks.
      2. WORKABILITY WINDOWS: When was the site most productive?
      3. STANDING TIME: Quantify potential lost hours based on inclement weather.
      4. SUMMARY: One paragraph executive summary.
      5. RISK RATING: Assign a rating of [LOW, MODERATE, HIGH] for continuity.

      Maintain a technical, data-driven AEC (Architecture, Engineering, Construction) industry tone.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      setSummary(result.text || "Summary analysis not available.");
    } catch (error) {
      console.error("AI Summary Error:", error);
    } finally {
      setIsSummarizing(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('clear')) return <Sun className="w-5 h-5 text-yellow-500" />;
    if (c.includes('cloud')) return <Cloudy className="w-5 h-5 text-gray-400" />;
    if (c.includes('rain')) return <CloudRain className="w-5 h-5 text-blue-400" />;
    if (c.includes('snow')) return <Snowflake className="w-5 h-5 text-teal-300" />;
    return <Wind className="w-5 h-5 text-zinc-400" />;
  };

  return (
    <div className="bg-white border border-zinc-100 p-8 space-y-8 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-architect-coal uppercase tracking-widest flex items-center gap-2">
            <History className="w-4 h-4 text-olive-primary" />
            Atmospheric Pulse Logger
          </h3>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Hourly Chronological Weather Capture</p>
        </div>
        
        <button 
           onClick={generateAiSummary}
           disabled={isSummarizing || logs.length === 0}
           className="px-6 py-2 bg-architect-coal text-white text-[10px] font-black uppercase tracking-widest hover:bg-olive-primary transition-all flex items-center gap-2 disabled:opacity-50"
        >
           {isSummarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />}
           Generate Impact Analysis
        </button>
      </div>

      <AnimatePresence>
        {summary && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 bg-zinc-900 text-white rounded-none border-l-4 border-olive-primary relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <div className="p-1.5 bg-olive-primary rounded-sm shadow-[0_0_15px_-3px_rgba(163,178,11,0.5)]">
                    <TrendingUp className="w-4 h-4 text-white" />
                 </div>
                 <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Critical Path Impact Vector</span>
                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Atmospheric Delay Analysis v1.0</p>
                 </div>
              </div>
              <button 
                onClick={() => setSummary(null)}
                className="text-zinc-600 hover:text-white transition-colors font-black text-[9px] uppercase tracking-widest"
              >
                Close Report
              </button>
            </div>

            <div className="prose prose-invert max-w-none prose-p:text-[11px] prose-p:text-zinc-300 prose-headings:text-olive-primary prose-headings:text-[10px] prose-headings:font-black prose-headings:uppercase prose-headings:tracking-widest prose-li:text-[10px] prose-li:text-zinc-400">
               <Markdown>{summary}</Markdown>
            </div>
            
            <div className="mt-8 pt-6 border-t border-zinc-800 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 bg-olive-primary rounded-full animate-pulse" />
                     <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Decision Support Signal Active</span>
                  </div>
               </div>
               <p className="text-[8px] text-zinc-600 font-bold uppercase italic">AI Generated Forensic Analytics - Verification Recommended</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
        {logs.map((log) => (
          <div key={log.id} className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-100 group hover:border-olive-primary transition-all">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white rounded-lg shadow-sm border border-zinc-100">
                 {getWeatherIcon(log.condition)}
              </div>
              <div>
                <p className="text-[10px] font-bold text-architect-coal uppercase">{log.condition}</p>
                <p className="text-[8px] text-zinc-400 font-mono">{log.timestamp.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-8 text-right">
               <div>
                  <p className="text-xs font-bold text-architect-coal">{log.temp}°C</p>
                  <p className="text-[7px] font-black text-zinc-300 uppercase tracking-tighter">TEMP</p>
               </div>
               <div>
                  <p className="text-xs font-bold text-architect-coal">{log.windSpeed} km/h</p>
                  <p className="text-[7px] font-black text-zinc-300 uppercase tracking-tighter">WIND</p>
               </div>
               <div>
                  <p className="text-xs font-bold text-architect-coal">{log.humidity}%</p>
                  <p className="text-[7px] font-black text-zinc-300 uppercase tracking-tighter">HUMIDITY</p>
               </div>
            </div>
          </div>
        ))}
        {!loading && logs.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-zinc-50 rounded-2xl">
             <AlertTriangle className="w-8 h-8 text-zinc-100 mx-auto mb-2" />
             <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">No Telemetry Recorded</p>
          </div>
        )}
      </div>
    </div>
  );
}
