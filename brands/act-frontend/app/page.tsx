import Image from 'next/image';
import Link from 'next/link';
import ButtonLinkout from '../components/ui/button-linkout';

/**
 * Home page implementing the Figma design
 */
export default function Home() {
  return (
    <div className="bg-white flex flex-col items-center pb-[20px] pt-0 px-[40px] relative w-full">
      <div className="absolute backdrop-blur-[15px] backdrop-filter bg-[rgba(255,255,255,0.4)] flex font-bold gap-[27px] items-center px-[24px] py-[20px] rounded-[100px] text-[14px] text-black text-center text-nowrap top-[16px] z-10"
           style={{ left: '50%', transform: 'translateX(-50%)' }}>
        <button aria-label="Jump to product benefits section" className="text-nowrap leading-[1.4]">
          Benefits
        </button>
        <button aria-label="Jump to product specifications section" className="text-nowrap leading-[1.4]">
          Specifications
        </button>
        <button aria-label="Jump to product how-to section" className="text-nowrap leading-[1.4]">
          How-to
        </button>
        <button aria-label="Jump to contact us section" className="text-nowrap leading-[1.4]">
          Contact Us
        </button>
      </div>
      
      <nav className="flex flex-col items-center p-0 w-full">
        <div className="flex h-[148px] items-center justify-between max-w-[1500px] pb-[80px] pt-[20px] px-0 w-full">
          <Link href="/" className="flex flex-col font-medium leading-[1.2] text-[30px] text-black text-nowrap tracking-[-1.5px]">
            Area
          </Link>
          <ButtonLinkout className="bg-[#485c11] cursor-pointer px-[22px] py-[14px] rounded-[1000px] text-white" />
        </div>
      </nav>
      
      <header className="flex flex-col gap-[240px] items-start max-w-[1500px] overflow-clip p-0 w-full">
        <h1 className="font-serif var(--font-crimson) leading-[0.9] text-[160px] text-black text-center tracking-[-6.8px] w-full">
          Browse everything.
        </h1>
        <div className="bg-[#8e9c78] h-[362px] rounded-[30px] w-full relative">
          <div aria-label="Visual chart illustrating a 78% increase in efficiency across 33 regions between 2021 and 2024, with clear upward trends year over year" 
               className="absolute bg-black border-[2px] border-[rgba(255,255,255,0.5)] border-solid h-[644px] overflow-clip rounded-[24px] shadow-[0px_-4px_20px_0px_rgba(0,0,0,0.1)] w-[907px]"
               style={{ left: 'calc(50% + 0.5px)', top: '50%', transform: 'translate(-50%, -50%)' }}>
            <div className="absolute h-[607px] rounded-[16px] w-[870px]"
                 style={{ left: '50%', top: '16.5px', transform: 'translateX(-50%)' }}>
              <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[16px]">
                <div className="w-full h-full bg-gradient-to-br from-[#1c2a1b] to-[#2c3c29]"></div>
                {/* This would be replaced with actual chart data in a real implementation */}
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex flex-col items-start p-0 w-full">
        <div className="flex flex-col gap-[30px] items-center max-w-[1500px] px-0 py-[50px] w-full">
          <p className="font-normal leading-[1.4] text-[#6f6f6f] text-[15px] tracking-[-0.075px] w-full">
            Trusted by:
          </p>
          <div className="flex flex-wrap gap-[20px_40px] items-center justify-center w-full">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col h-[84px] items-start justify-center overflow-clip p-[20px] w-[154px]">
                <div className="basis-0 grow mix-blend-exclusion opacity-60 w-full h-full relative">
                  {/* Placeholder for logo images */}
                  <div className="absolute inset-0 bg-gray-300 opacity-60"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <section className="flex flex-col items-center px-0 py-[120px] w-full">
          <div className="flex flex-col gap-[60px] items-start max-w-[1500px] px-0 py-0 w-full">
            <div className="flex flex-col gap-[40px] items-start w-full">
              <h2 className="font-serif var(--font-crimson) leading-[1] text-[40px] text-black tracking-[-1.2px] w-full">
                Area makes complex regional data intuitive and actionable
              </h2>
              <p className="font-normal leading-[1.4] text-[#6f6f6f] text-[15px] tracking-[-0.075px] w-[50%]">
                Our advanced platform transforms fragmented regional insights into clear, actionable intelligence. With Area, you'll navigate complex data landscapes with confidence and precision.
              </p>
            </div>
            
            <div className="flex gap-[20px] items-start w-full">
              {[
                { 
                  title: "Comprehensive Data",
                  description: "Access all regional metrics in one unified platform" 
                },
                { 
                  title: "Intuitive Interface",
                  description: "Navigate complex data with our user-friendly design" 
                },
                { 
                  title: "Actionable Insights",
                  description: "Turn raw information into strategic advantages" 
                }
              ].map((item, i) => (
                <div key={i} className="basis-0 border border-[#e9e9e9] flex flex-col gap-[16px] grow items-start min-h-px min-w-[240px] p-[30px] rounded-[30px]">
                  <h3 className="font-serif var(--font-crimson) leading-none text-[18px] text-black tracking-[-0.54px] w-full">
                    {item.title}
                  </h3>
                  <p className="font-normal leading-[1.4] text-[#6f6f6f] text-[15px] tracking-[-0.075px] w-full">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        <section className="flex flex-col items-center px-0 py-[60px] w-full">
          <div className="aspect-[1120/620] flex items-start max-h-[830px] max-w-[1500px] overflow-clip rounded-[30px] w-full">
            <div className="w-full h-full relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#8e9c78] to-[#dfecc6]"></div>
            </div>
          </div>
        </section>
        
        <section className="flex flex-col gap-[60px] items-start max-w-[1500px] px-0 py-[80px] w-full">
          <div className="flex flex-col gap-[40px] items-start w-full">
            <h2 className="font-serif var(--font-crimson) leading-[1] text-[40px] text-black tracking-[-1.2px] w-full">
              Dive into the details
            </h2>
            <p className="font-normal leading-[1.4] text-[#6f6f6f] text-[15px] tracking-[-0.075px] w-[50%]">
              Area provides unprecedented granularity in your regional analytics, empowering you to identify patterns and opportunities others miss.
            </p>
          </div>
          
          <div className="flex flex-col gap-[40px] items-start w-full">
            <div className="flex gap-[20px] items-start justify-between w-full">
              <div className="basis-0 grow min-h-px min-w-[240px]">
                <div className="font-serif var(--font-crimson) leading-[0.9] text-[60px] text-black tracking-[-1.8px] w-full">
                  78%
                </div>
                <p className="font-normal leading-[1.4] text-[#6f6f6f] text-[15px] tracking-[-0.075px] w-full">
                  More regional data points than competing solutions
                </p>
              </div>
              
              <div className="basis-0 grow min-h-px min-w-[240px]">
                <div className="font-serif var(--font-crimson) leading-[0.9] text-[60px] text-black tracking-[-1.8px] w-full">
                  33
                </div>
                <p className="font-normal leading-[1.4] text-[#6f6f6f] text-[15px] tracking-[-0.075px] w-full">
                  Proprietary analysis frameworks
                </p>
              </div>
              
              <div className="basis-0 grow min-h-px min-w-[240px]">
                <div className="font-serif var(--font-crimson) leading-[0.9] text-[60px] text-black tracking-[-1.8px] w-full">
                  2-3x
                </div>
                <p className="font-normal leading-[1.4] text-[#6f6f6f] text-[15px] tracking-[-0.075px] w-full">
                  Faster insights than traditional methods
                </p>
              </div>
            </div>
          </div>
        </section>
        
        <section className="flex flex-col items-center px-0 py-[60px] w-full">
          <div className="flex flex-col gap-[60px] items-start max-w-[1500px] w-full">
            <div className="flex flex-col gap-[40px] items-start w-full">
              <h2 className="font-serif var(--font-crimson) leading-[1] text-[40px] text-black tracking-[-1.2px] w-full">
                How it works
              </h2>
            </div>
            
            <div className="flex items-start w-full">
              {[
                {
                  number: "01",
                  title: "Sign Up and Get Started",
                  description: "With our intuitive setup, you're up and running in minutes."
                },
                {
                  number: "02",
                  title: "Customize and Configure",
                  description: "Adapt Area to your specific requirements and preferences."
                },
                {
                  number: "03",
                  title: "Grow Your Business",
                  description: "Make informed decisions to exceed your goals."
                }
              ].map((step, i) => (
                <section key={i} aria-label={`Step ${i+1} of 3`} className="basis-0 border-t border-[#e9e9e9] flex flex-col gap-[60px] grow items-start min-h-px min-w-[240px] pb-[20px] pl-0 pr-[30px] pt-[60px]">
                  <p className="font-normal leading-none text-[#929292] text-[80px] tracking-[-3.2px] w-full">
                    {step.number}
                  </p>
                  <div className="flex flex-col gap-[20px] items-start w-full">
                    <p className="font-serif var(--font-crimson) leading-none text-[18px] text-black tracking-[-0.54px] w-full">
                      {step.title}
                    </p>
                    <p className="font-normal leading-[1.4] text-[#6f6f6f] text-[15px] tracking-[-0.075px] w-full">
                      {step.description}
                    </p>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>
        
        <div className="flex flex-col items-center pb-[40px] pt-0 px-0 w-full">
          <div aria-label="Image showing a winding path going up a mountain" className="aspect-[1120/620] flex items-start max-h-[830px] max-w-[1500px] overflow-clip rounded-[30px] w-full">
            <div className="basis-0 grow h-full relative w-full">
              <div className="absolute inset-0 bg-gradient-to-br from-[#dfecc6] to-[#8e9c78]"></div>
            </div>
          </div>
        </div>
        
        <section className="border-t border-[#e9e9e9] flex flex-col gap-[40px] items-center max-w-[1500px] px-[300px] py-[120px] w-full">
          <p className="font-serif var(--font-crimson) leading-[0.9] text-[60px] text-black text-center tracking-[-1.8px] w-full">
            Connect with us
          </p>
          <p className="font-normal leading-[1.4] text-[#6f6f6f] text-[15px] text-center tracking-[-0.075px] w-full">
            Schedule a quick call to learn how Area can turn your regional data into a powerful advantage.
          </p>
          <ButtonLinkout className="bg-[#485c11] cursor-pointer flex gap-[2px] items-center justify-center px-[22px] py-[14px] rounded-[1000px] w-full text-white" />
        </section>
      </main>
      
      <footer className="border-t border-[#e9e9e9] flex flex-col gap-[80px] items-start justify-end max-w-[1500px] pb-[20px] pt-[40px] px-0 w-full">
        <div className="flex h-[40px] items-center justify-between w-full">
          <div className="flex font-bold gap-[27px] items-center leading-[1.4] text-[14px] text-black text-center text-nowrap tracking-[-0.35px]">
            <button className="text-nowrap">Benefits</button>
            <button className="text-nowrap">Specifications</button>
            <button className="text-nowrap">How-to</button>
          </div>
        </div>
        <div className="flex gap-[40px] items-end w-full">
          <div aria-label="Company logo" className="flex items-end">
            <div className="h-[70px] w-[31.751px]">
              {/* Company logo */}
              <div className="h-full w-full bg-[#485c11]"></div>
            </div>
          </div>
          <div className="basis-0 flex font-mono var(--font-roboto-mono) font-normal gap-[16px] grow items-center leading-[1.4] min-h-px min-w-px text-[#485c11] text-[12px] text-nowrap tracking-[-0.12px]">
            <div className="flex flex-col justify-center">
              <p className="leading-[1.4] text-nowrap"> Area.</p>
            </div>
            <div className="flex flex-col justify-center">
              <p className="leading-[1.4] text-nowrap">2025</p>
            </div>
          </div>
          <div className="flex flex-col font-mono var(--font-roboto-mono) font-normal justify-center leading-[1.4] text-[#485c11] text-[12px] text-nowrap tracking-[-0.12px]">
            <p className="leading-[1.4]">All Rights Reserved</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
