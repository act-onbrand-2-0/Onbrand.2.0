import { useState } from 'react';

export default function App() {
  const [isOn, setIsOn] = useState(false);

  const handleToggle = () => {
    const newState = !isOn;
    setIsOn(newState);
    
    if (newState) {
      // Scroll to the homepage section
      setTimeout(() => {
        document.getElementById('homepage')?.scrollIntoView({ 
          behavior: 'smooth' 
        });
      }, 300);
    }
  };

  return (
    <div className="h-screen overflow-y-auto snap-y snap-mandatory">
      {/* Toggle Section */}
      <div 
        className="h-screen flex items-center justify-center cursor-pointer transition-colors duration-500 snap-start"
        style={{ backgroundColor: isOn ? '#889def' : '#24326b' }}
        onClick={handleToggle}
      >
        <div className="relative w-[80vw] h-[60vh] max-w-[1200px] max-h-[600px]">
          {/* Toggle Track */}
          <div 
            className="w-full h-full rounded-full border-8 relative transition-all duration-500"
            style={{ 
              borderColor: isOn ? '#24326b' : '#889def',
              backgroundColor: isOn ? '#24326b40' : '#889def40'
            }}
          >
            {/* Toggle Circle */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 rounded-full transition-all duration-500 shadow-2xl"
              style={{
                width: 'min(50vh, 40vw)',
                height: 'min(50vh, 40vw)',
                backgroundColor: isOn ? '#889def' : '#24326b',
                left: isOn ? 'calc(100% - min(50vh, 40vw) - 2rem)' : '2rem'
              }}
            >
              {/* Inner glow effect */}
              <div 
                className="absolute inset-8 rounded-full"
                style={{
                  backgroundColor: isOn ? '#ffffff20' : '#00000020'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Homepage Section */}
      <div 
        id="homepage"
        className="h-screen flex items-center justify-center snap-start"
        style={{ backgroundColor: '#889def' }}
      >
        <div className="text-center">
          <h1 className="text-9xl mb-6" style={{ color: '#24326b', fontFamily: 'League Spartan, sans-serif' }}>
            onbrand
          </h1>
          <p className="text-3xl" style={{ color: '#24326b', fontFamily: 'League Spartan, sans-serif' }}>
            AI-powered brand management platform for perfect brand consistency
          </p>
          <div className="flex gap-6 justify-center mt-12">
            <button 
              className="px-10 py-4 rounded-full transition-all hover:scale-105"
              style={{ 
                backgroundColor: '#24326b', 
                color: '#889def',
                fontFamily: 'League Spartan, sans-serif'
              }}
            >
              Get Demo
            </button>
            <button 
              className="px-10 py-4 rounded-full border-4 transition-all hover:scale-105"
              style={{ 
                backgroundColor: 'transparent',
                borderColor: '#24326b',
                color: '#24326b',
                fontFamily: 'League Spartan, sans-serif'
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}