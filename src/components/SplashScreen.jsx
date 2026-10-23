import { useEffect, useState } from 'react';
import { MessageCircle, Bot, BarChart2, Users, CheckCircle } from 'lucide-react';
import NagarNetraLogo from './NagarNetraLogo';

const steps = [
  { id: 1, icon: MessageCircle, label: 'WhatsApp Received', color: 'text-green-500', bg: 'bg-green-100' },
  { id: 2, icon: Bot, label: 'Analysed', color: 'text-blue-500', bg: 'bg-blue-100' },
  { id: 3, icon: BarChart2, label: 'Ranking Produced', color: 'text-orange-500', bg: 'bg-orange-100' },
  { id: 4, icon: Users, label: 'Coordinated Team', color: 'text-purple-500', bg: 'bg-purple-100' },
  { id: 5, icon: CheckCircle, label: 'Feedback', color: 'text-teal-500', bg: 'bg-teal-100' }
];

export default function SplashScreen({ onComplete }) {
  const [activeStep, setActiveStep] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window === "undefined" ? 500 : window.innerWidth
  );

  useEffect(() => {
    // Sequence the animation steps
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep += 1;
      setActiveStep(currentStep);
      
      if (currentStep >= steps.length + 1) {
        clearInterval(interval);
        setIsFadingOut(true);
        setTimeout(() => {
          onComplete();
        }, 800); // Wait for fade out
      }
    }, 800); // 800ms per step

    return () => clearInterval(interval);
  }, [onComplete]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const radius = Math.min(150, Math.max(104, viewportWidth * 0.31));
  const isCompact = viewportWidth < 520;

  return (
    <div className={`fixed inset-0 z-[9999] bg-white/95 backdrop-blur-sm flex items-center justify-center transition-opacity duration-700 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
      
      <div className="relative flex items-center justify-center w-[min(500px,92vw)] h-[min(500px,92vw)]">
        {/* Center Logo */}
        <div className="absolute z-10 flex flex-col items-center justify-center">
          <NagarNetraLogo size={isCompact ? 72 : 88} className="shadow-2xl shadow-indigo-300" />
          <h1 className="mt-5 sm:mt-6 text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">NagarNetra</h1>
          <p className="text-xs uppercase tracking-widest text-indigo-500 font-bold mt-1">Initializing...</p>
        </div>

        {/* Circular Connecting Dashed Line */}
        <svg className="absolute inset-0 w-full h-full -z-10 animate-[spin_30s_linear_infinite] opacity-15">
          <circle cx="50%" cy="50%" r={radius} fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="8 8" />
        </svg>

        {/* Circular Steps */}
        {steps.map((step, index) => {
          const angle = (index * (360 / steps.length)) - 90; // Start at top (-90 degrees)
          const rad = angle * (Math.PI / 180);
          const x = Math.cos(rad) * radius;
          const y = Math.sin(rad) * radius;
          
          const isActive = activeStep >= index + 1;
          const isCurrent = activeStep === index + 1;

          const Icon = step.icon;

          return (
            <div 
              key={step.id}
              className="absolute flex flex-col items-center justify-center transition-all duration-500"
              style={{
                transform: `translate(${x}px, ${y}px)`,
                opacity: isActive ? 1 : 0.15,
                scale: isCurrent ? 1.15 : 1
              }}
            >
              <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-lg ${isActive ? step.bg : 'bg-gray-100'} transition-colors duration-500`}>
                <Icon size={isCompact ? 22 : 28} className={isActive ? step.color : 'text-gray-400'} />
              </div>
              <span className={`absolute top-12 sm:top-16 w-24 sm:w-auto text-center sm:whitespace-nowrap text-xs sm:text-sm font-bold ${isActive ? 'text-gray-900' : 'text-gray-300'} transition-colors duration-500 bg-white/80 px-2 rounded-md`}>
                {step.label}
              </span>
            </div>
          );
        })}

      </div>
    </div>
  );
}
