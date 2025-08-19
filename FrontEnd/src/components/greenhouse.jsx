import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Sky } from '@react-three/drei';
import { Droplets, Wind, Sun, Zap, Gauge } from 'lucide-react';

// Enhanced sensor data with API integration
const useSensorData = () => {
  const [data, setData] = useState({
    temperature: 24.5,
    humidity: 65,
    solarOutput: 85,
    waterLevel: 75,
    energyEfficiency: 92,
    co2Saved: 2.4,
    loading: true,
    error: null,
    lastUpdated: null
  });

  // Function to fetch real sensor data from API
  const fetchSensorData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('http://localhost:8075/api/greenhouse/sensor-data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const sensorData = await response.json();
      
      // Update state with real data from API
      setData(prev => ({
        ...prev,
        temperature: sensorData.temperature || prev.temperature,
        humidity: sensorData.humidity || prev.humidity,
        solarOutput: sensorData.solarOutput || sensorData.sunlight || prev.solarOutput,
        waterLevel: sensorData.waterLevel || prev.waterLevel,
        energyEfficiency: sensorData.energyEfficiency || prev.energyEfficiency,
        co2Saved: sensorData.co2Saved || prev.co2Saved,
        loading: false,
        error: null,
        lastUpdated: new Date().toLocaleTimeString()
      }));

      console.log('✅ Sensor data fetched successfully:', sensorData);

    } catch (error) {
      console.error('❌ Error fetching sensor data:', error);
      
      // Fall back to simulated data if API fails
      setData(prev => ({
        temperature: Math.max(20, Math.min(35, prev.temperature + (Math.random() - 0.5) * 2)),
        humidity: Math.max(40, Math.min(90, prev.humidity + (Math.random() - 0.5) * 3)),
        solarOutput: Math.max(70, Math.min(100, prev.solarOutput + (Math.random() - 0.5) * 5)),
        waterLevel: Math.max(20, Math.min(100, prev.waterLevel + (Math.random() - 0.5) * 2)),
        energyEfficiency: Math.max(85, Math.min(98, prev.energyEfficiency + (Math.random() - 0.5))),
        co2Saved: Math.max(1, Math.min(5, prev.co2Saved + (Math.random() - 0.5) * 0.2)),
        loading: false,
        error: error.message,
        lastUpdated: new Date().toLocaleTimeString()
      }));
    }
  };

  useEffect(() => {
    // Fetch data immediately on mount
    fetchSensorData();

    // Set up interval to fetch data every 5 seconds
    const interval = setInterval(() => {
      fetchSensorData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return { ...data, refetch: fetchSensorData };
};

const Greenhouse = () => {
  const [activeSpray, setActiveSpray] = useState(false);
  const [fanStatus, setFanStatus] = useState({ intake: false, exhaust: false });
  const [isInside, setIsInside] = useState(false);
  const sensorData = useSensorData();

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas camera={{ position: [0, 8, 22], fov: 50 }}>
        {/* Realistic sky */}
        <Sky sunPosition={[100, 20, 100]} turbidity={8} rayleigh={6} mieCoefficient={0.005} mieDirectionalG={0.8} inclination={0.49} azimuth={0.25} />
        {/* Green ground */}
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#3fa34d" />
        </mesh>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
        <OrbitControls />
        <EnhancedGreenhouse
          activeSpray={activeSpray}
          fanStatus={fanStatus}
          sensorData={sensorData}
        />
        <Birds />
        <Sun3D />
        <SolarPanels solarOutput={sensorData.solarOutput} />
        <WaterTank waterLevel={sensorData.waterLevel} />
      </Canvas>
      <ControlPanel
        sensorData={sensorData}
        activeSpray={activeSpray}
        setActiveSpray={setActiveSpray}
        fanStatus={fanStatus}
        setFanStatus={setFanStatus}
        isInside={isInside}
        setIsInside={setIsInside}
      />
    </div>
  );
};

// Enhanced flying birds with more natural movement
const Birds = () => {
  const birdsRef = useRef();
  const birds = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 15; i++) {
      temp.push({
        position: [Math.random() * 60 - 30, 20 + Math.random() * 10, Math.random() * 60 - 30],
        speed: 0.01 + Math.random() * 0.015,
        offset: Math.random() * Math.PI * 2,
        radius: 15 + Math.random() * 12,
        wingSpeed: 3 + Math.random() * 2
      });
    }
    return temp;
  }, []);

  useFrame((state) => {
    if (birdsRef.current) {
      birdsRef.current.children.forEach((bird, i) => {
        const birdData = birds[i];
        const angle = state.clock.elapsedTime * birdData.speed + birdData.offset;
        bird.position.x = Math.sin(angle) * birdData.radius;
        bird.position.z = Math.cos(angle) * birdData.radius;
        bird.position.y = birdData.position[1] + Math.sin(angle * 2) * 3;
        bird.rotation.y = angle + Math.PI / 2;
        
        // Wing flapping animation
        const wingFlap = Math.sin(state.clock.elapsedTime * birdData.wingSpeed) * 0.3;
        bird.children[1].rotation.z = Math.PI / 6 + wingFlap;
        bird.children[2].rotation.z = -Math.PI / 6 - wingFlap;
      });
    }
  });

  return (
    <group ref={birdsRef}>
      {birds.map((_, i) => (
        <group key={i} position={birds[i].position}>
          <mesh>
            <coneGeometry args={[0.1, 0.3, 6]} />
            <meshLambertMaterial color="#2C3E50" />
          </mesh>
          <mesh position={[0.12, 0, 0]} rotation={[0, 0, Math.PI / 6]}>
            <boxGeometry args={[0.18, 0.03, 0.1]} />
            <meshLambertMaterial color="#34495E" />
          </mesh>
          <mesh position={[-0.12, 0, 0]} rotation={[0, 0, -Math.PI / 6]}>
            <boxGeometry args={[0.18, 0.03, 0.1]} />
            <meshLambertMaterial color="#34495E" />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// Animated sun with rays
const Sun3D = () => {
  const sunRef = useRef();
  const raysRef = useRef();
  
  useFrame((state) => {
    if (sunRef.current) {
      sunRef.current.rotation.y += 0.01;
    }
    if (raysRef.current) {
      raysRef.current.rotation.z += 0.005;
    }
  });

  return (
    <group position={[40, 30, -20]}>
      <mesh ref={sunRef}>
        <sphereGeometry args={[3, 16, 16]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>
      <group ref={raysRef}>
        {Array.from({ length: 12 }).map((_, i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 12]} position={[4.5, 0, 0]}>
            <boxGeometry args={[1, 0.1, 0.1]} />
            <meshBasicMaterial color="#FFA500" />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// Solar panel system with animation
const SolarPanels = ({ solarOutput }) => {
  const panelsRef = useRef();
  
  useFrame((state) => {
    if (panelsRef.current) {
      // Panels track the sun
      const sunAngle = state.clock.elapsedTime * 0.1;
      panelsRef.current.rotation.y = Math.sin(sunAngle) * 0.3;
      panelsRef.current.rotation.x = Math.cos(sunAngle) * 0.1 - 0.2;
    }
  });

  return (
    <group ref={panelsRef} position={[15, 2, -10]}>
      {/* Solar panel array */}
      {Array.from({ length: 6 }).map((_, i) => (
        <group key={i} position={[(i % 3) * 3, 0, Math.floor(i / 3) * 2]}>
          <mesh>
            <boxGeometry args={[2.8, 0.1, 1.8]} />
            <meshLambertMaterial color="#1E3A8A" />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[2.6, 0.02, 1.6]} />
            <meshLambertMaterial color="#3B82F6" />
          </mesh>
          {/* Support structure */}
          <mesh position={[0, -1, 0]}>
            <boxGeometry args={[0.1, 2, 0.1]} />
            <meshLambertMaterial color="#6B7280" />
          </mesh>
        </group>
      ))}
      
      {/* Energy flow visualization */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={`energy-${i}`} position={[
          1.5 + Math.sin(Date.now() * 0.005 + i * 0.5) * 0.5,
          2 + i * 0.3,
          -3 + Math.cos(Date.now() * 0.005 + i * 0.5) * 0.3
        ]}>
          <sphereGeometry args={[0.05]} />
          <meshBasicMaterial color="#FFFF00" />
        </mesh>
      ))}
    </group>
  );
};

// Water tank system
const WaterTank = ({ waterLevel }) => {
  return (
    <group position={[-15, 3, 5]}>
      {/* Main tank */}
      <mesh>
        <cylinderGeometry args={[2, 2, 5, 16]} />
        <meshLambertMaterial color="#C0C0C0" transparent opacity={0.8} />
      </mesh>
      
      {/* Water inside */}
      <mesh position={[0, -2.5 + (waterLevel / 100) * 2.5, 0]}>
        <cylinderGeometry args={[1.9, 1.9, (waterLevel / 100) * 5, 16]} />
        <meshLambertMaterial color="#4FC3F7" transparent opacity={0.7} />
      </mesh>
      
      {/* Tank support */}
      <mesh position={[0, -3, 0]}>
        <cylinderGeometry args={[2.2, 2.2, 1, 8]} />
        <meshLambertMaterial color="#666" />
      </mesh>
      
      {/* Water level indicator */}
      <Text position={[0, 1, 2.5]} fontSize={0.3} color="#000">
        {waterLevel.toFixed(0)}%
      </Text>
    </group>
  );
};

// Plant watering animation component
const PlantWateringEffect = ({ plantPosition, active, intensity = 1 }) => {
  const waterParticlesRef = useRef();
  const soilMoistureRef = useRef();
  
  useFrame((state) => {
    if (!active) return;
    
    const time = state.clock.elapsedTime * 2;
    
    // Animate water droplets falling from sprinkler to plant
    if (waterParticlesRef.current) {
      waterParticlesRef.current.children.forEach((particle, i) => {
        const offset = i * 0.2;
        const fallTime = (time + offset) % 3;
        const startY = 7.5;
        const endY = plantPosition[1] + 0.5;
        
        // Water droplet falling animation
        particle.position.y = startY - (fallTime / 3) * (startY - endY);
        particle.position.x = plantPosition[0] + Math.sin(time + offset) * 0.3;
        particle.position.z = plantPosition[2] + Math.cos(time + offset) * 0.3;
        
        // Fade out as it approaches the plant
        const opacity = fallTime < 2.5 ? 0.8 : 0.8 - ((fallTime - 2.5) / 0.5) * 0.8;
        particle.material.opacity = Math.max(0, opacity);
        
        // Scale based on fall progress
        const scale = 0.8 + (fallTime / 3) * 0.4;
        particle.scale.setScalar(scale);
      });
    }
    
    // Animate soil moisture visualization
    if (soilMoistureRef.current) {
      const moistureIntensity = Math.sin(time * 0.5) * 0.3 + 0.7;
      soilMoistureRef.current.material.opacity = moistureIntensity * intensity;
      soilMoistureRef.current.scale.setScalar(1 + Math.sin(time) * 0.1);
    }
  });

  if (!active) return null;

  return (
    <group>
      {/* Water droplets */}
      <group ref={waterParticlesRef}>
        {Array.from({ length: 12 }).map((_, i) => (
          <mesh key={`water-${i}`}>
            <sphereGeometry args={[0.03]} />
            <meshBasicMaterial color="#4FC3F7" transparent />
          </mesh>
        ))}
      </group>
      
      {/* Soil moisture indicator */}
      <mesh 
        ref={soilMoistureRef}
        position={[plantPosition[0], plantPosition[1] - 0.2, plantPosition[2]]}
      >
        <cylinderGeometry args={[0.35, 0.35, 0.05]} />
        <meshLambertMaterial color="#2E7D32" transparent opacity={0.4} />
      </mesh>
      
      {/* Water absorption rings */}
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh 
          key={`ring-${i}`}
          position={[plantPosition[0], plantPosition[1] - 0.15, plantPosition[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.2 + i * 0.15, 0.25 + i * 0.15]} />
          <meshBasicMaterial 
            color="#4FC3F7" 
            transparent 
            opacity={0.3 - i * 0.1}
          />
        </mesh>
      ))}
    </group>
  );
};

// Enhanced plant component with growth animation
const AnimatedPlant = ({ position, plantType = 0, wateringActive = false, growthStage = 1 }) => {
  const plantRef = useRef();
  const leavesRef = useRef();
  
  useFrame((state) => {
    if (plantRef.current) {
      // Gentle swaying motion
      const sway = Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.05;
      plantRef.current.rotation.z = sway;
      
      // Growth animation when watering
      if (wateringActive) {
        const growthPulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        plantRef.current.scale.setScalar(growthStage * growthPulse);
      }
    }
    
    // Leaves rustling
    if (leavesRef.current) {
      leavesRef.current.children.forEach((leaf, i) => {
        const rustle = Math.sin(state.clock.elapsedTime * 3 + i) * 0.1;
        leaf.rotation.z = rustle;
      });
    }
  });

  const colors = ['#4CAF50', '#66BB6A', '#81C784', '#A5D6A7'];
  const plantColor = colors[plantType % colors.length];

  return (
    <group ref={plantRef} position={position}>
      {/* Plant pot */}
      <mesh>
        <cylinderGeometry args={[0.18, 0.18, 0.35]} />
        <meshLambertMaterial color="#795548" />
      </mesh>
      
      {/* Soil */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.05]} />
        <meshLambertMaterial color={wateringActive ? "#3E2723" : "#5D4037"} />
      </mesh>
      
      {/* Main plant body */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.3 * growthStage]} />
        <meshLambertMaterial color={plantColor} />
      </mesh>
      
      {/* Animated leaves */}
      <group ref={leavesRef}>
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          const x = Math.cos(angle) * 0.25;
          const z = Math.sin(angle) * 0.25;
          return (
            <mesh 
              key={i} 
              position={[x, 0.5, z]} 
              rotation={[0, angle, Math.PI / 6]}
            >
              <boxGeometry args={[0.15 * growthStage, 0.25 * growthStage, 0.02]} />
              <meshLambertMaterial color={plantColor} />
            </mesh>
          );
        })}
      </group>
      
      {/* Growth indicators when watering */}
      {wateringActive && (
        <group>
          {/* Sparkle effects */}
          {Array.from({ length: 5 }).map((_, i) => (
            <mesh 
              key={`sparkle-${i}`}
              position={[
                (Math.random() - 0.5) * 0.6,
                0.3 + Math.random() * 0.4,
                (Math.random() - 0.5) * 0.6
              ]}
            >
              <sphereGeometry args={[0.02]} />
              <meshBasicMaterial color="#FFD700" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};

// Enhanced greenhouse with plant watering system
const EnhancedGreenhouse = ({ activeSpray, fanStatus, sensorData }) => {
  const [plantGrowthStages, setPlantGrowthStages] = useState({});
  
  // Simulate plant growth when watering
  useEffect(() => {
    if (activeSpray) {
      const interval = setInterval(() => {
        setPlantGrowthStages(prev => {
          const newStages = { ...prev };
          Object.keys(newStages).forEach(key => {
            newStages[key] = Math.min(1.3, newStages[key] + 0.01);
          });
          return newStages;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [activeSpray]);

  // Initialize plant growth stages
  useEffect(() => {
    const stages = {};
    for (let bed = 0; bed < 4; bed++) {
      for (let plant = 0; plant < 9; plant++) {
        stages[`${bed}-${plant}`] = 0.8 + Math.random() * 0.4;
      }
    }
    setPlantGrowthStages(stages);
  }, []);

  return (
    <group>
      {/* Enhanced foundation with eco materials */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[14, 0.3, 10]} />
        <meshLambertMaterial color="#8D6E63" />
      </mesh>

      {/* Greenhouse structure */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[13.8, 0.4, 9.8]} />
        <meshLambertMaterial color="#A5D6A7" />
      </mesh>

      {/* Glass panels with better transparency */}
      <mesh position={[0, 2.5, -4.9]}>
        <boxGeometry args={[13, 5, 0.05]} />
        <meshLambertMaterial color="#E8F5E8" transparent opacity={0.2} />
      </mesh>
      <mesh position={[0, 2.5, 4.9]}>
        <boxGeometry args={[13, 5, 0.05]} />
        <meshLambertMaterial color="#E8F5E8" transparent opacity={0.2} />
      </mesh>
      <mesh position={[-6.9, 2.5, 0]}>
        <boxGeometry args={[0.05, 5, 9.8]} />
        <meshLambertMaterial color="#E8F5E8" transparent opacity={0.2} />
      </mesh>
      <mesh position={[6.9, 2.5, 0]}>
        <boxGeometry args={[0.05, 5, 9.8]} />
        <meshLambertMaterial color="#E8F5E8" transparent opacity={0.2} />
      </mesh>

      {/* Arched roof */}
      {Array.from({ length: 25 }).map((_, i) => {
        const angle = (i / 24) * Math.PI;
        const z = Math.cos(angle) * 4.5;
        const y = Math.sin(angle) * 4.5 + 5;
        
        return (
          <mesh key={`roof-${i}`} position={[0, y, z]} rotation={[angle, 0, 0]}>
            <boxGeometry args={[13, 0.4, 0.05]} />
            <meshLambertMaterial color="#E8F5E8" transparent opacity={0.3} />
          </mesh>
        );
      })}

      {/* Enhanced irrigation system */}
      <mesh position={[0, 8, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 13]} />
        <meshLambertMaterial color="#4A90E2" />
      </mesh>
      <mesh position={[0, 8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 10]} />
        <meshLambertMaterial color="#4A90E2" />
      </mesh>

      {/* Drip irrigation nozzles */}
      {[-5, -2, 1, 4].map((x, bedIndex) => (
        <group key={`nozzles-${bedIndex}`}>
          {[-3, 0, 3].map((z, rowIndex) => (
            <group key={`nozzle-${bedIndex}-${rowIndex}`}>
              <mesh position={[x, 7.8, z]}>
                <cylinderGeometry args={[0.05, 0.03, 0.2]} />
                <meshLambertMaterial color="#2196F3" />
              </mesh>
              {/* Water line down to plants */}
              <mesh position={[x, 7, z]} rotation={[0, 0, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 1.5]} />
                <meshLambertMaterial color="#4FC3F7" transparent opacity={0.6} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Water lines to tank */}
      <mesh position={[-8, 6, 2.5]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 12]} />
        <meshLambertMaterial color="#2196F3" />
      </mesh>

      {/* Enhanced plant beds with watering effects */}
      {[-5, -2, 1, 4].map((x, bedIndex) => (
        <group key={`bed-${bedIndex}`}>
          {/* Raised beds */}
          <mesh position={[x, 0.9, -3]}>
            <boxGeometry args={[2.5, 0.2, 2]} />
            <meshLambertMaterial color="#8D6E63" />
          </mesh>
          <mesh position={[x, 0.9, 0]}>
            <boxGeometry args={[2.5, 0.2, 2]} />
            <meshLambertMaterial color="#8D6E63" />
          </mesh>
          <mesh position={[x, 0.9, 3]}>
            <boxGeometry args={[2.5, 0.2, 2]} />
            <meshLambertMaterial color="#8D6E63" />
          </mesh>
          
          {/* Enhanced plants with watering animation */}
          {Array.from({ length: 9 }).map((_, plantIndex) => {
            const plantPosition = [
              x + (plantIndex % 3 - 1) * 0.7,
              1.5,
              -3 + Math.floor(plantIndex / 3) * 3
            ];
            const plantKey = `${bedIndex}-${plantIndex}`;
            const growthStage = plantGrowthStages[plantKey] || 1;
            
            return (
              <group key={`plant-${bedIndex}-${plantIndex}`}>
                <AnimatedPlant 
                  position={plantPosition}
                  plantType={plantIndex}
                  wateringActive={activeSpray}
                  growthStage={growthStage}
                />
                <PlantWateringEffect 
                  plantPosition={plantPosition}
                  active={activeSpray}
                  intensity={growthStage}
                />
              </group>
            );
          })}
        </group>
      ))}

      {/* Eco-friendly climate control */}
      <mesh position={[-6, 1.5, 4]}>
        <boxGeometry args={[1, 1.5, 0.8]} />
        <meshLambertMaterial color="#4CAF50" />
      </mesh>
      <Text position={[-6, 0.6, 4]} fontSize={0.2} color="#FFF">
        ECO-HEAT
      </Text>

      {/* Ventilation fans with eco design */}
      <Fan position={[-6.5, 7, 0]} rotation={[0, Math.PI / 2, 0]} isOn={fanStatus.intake} />
      <Fan position={[6.5, 7, 0]} rotation={[0, -Math.PI / 2, 0]} isOn={fanStatus.exhaust} />

      {/* Overhead water spray system */}
      {activeSpray && Array.from({ length: 12 }).map((_, i) => (
        <WaterSpray key={i} position={[
          (i % 4 - 1.5) * 3,
          7.5,
          (Math.floor(i / 4) - 1) * 3
        ]} active={activeSpray} />
      ))}
    </group>
  );
};

// Animated fan component
const Fan = ({ position, rotation = [0, 0, 0], isOn = true }) => {
  const fanRef = useRef();
  
  useFrame(() => {
    if (fanRef.current && isOn) {
      fanRef.current.rotation.z += 0.5;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <cylinderGeometry args={[0.5, 0.5, 0.2, 12]} />
        <meshLambertMaterial color="#2E7D32" />
      </mesh>
      <group ref={fanRef}>
        {[0, 1, 2, 3].map(i => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 4]} position={[0.3, 0, 0]}>
            <boxGeometry args={[0.5, 0.1, 0.03]} />
            <meshLambertMaterial color="#66BB6A" />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// Enhanced water spray effect
const WaterSpray = ({ position, active }) => {
  const sprayRef = useRef();
  
  useFrame((state) => {
    if (sprayRef.current && active) {
      sprayRef.current.children.forEach((particle, i) => {
        const time = state.clock.elapsedTime * 6 + i * 0.3;
        const spreadX = Math.cos(time * 0.8 + i) * 0.6;
        const spreadZ = Math.sin(time * 0.9 + i) * 0.6;
        const fallY = Math.sin(time) * 2.5;
        
        particle.position.x = position[0] + spreadX;
        particle.position.z = position[2] + spreadZ;
        particle.position.y = position[1] + fallY - 2;
        
        // Dynamic opacity based on fall progress
        const opacity = Math.max(0, 0.9 - Math.abs(fallY) / 3);
        particle.material.opacity = opacity;
        
        // Size variation
        const scale = 0.8 + Math.sin(time + i) * 0.3;
        particle.scale.setScalar(scale);
      });
    }
  });

  return (
    <group ref={sprayRef} position={position}>
      {Array.from({ length: 35 }).map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.04]} />
          <meshBasicMaterial color="#4FC3F7" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
};

// Enhanced control panel component with API status
const ControlPanel = ({ sensorData, activeSpray, setActiveSpray, fanStatus, setFanStatus, isInside, setIsInside }) => (
  <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded-xl shadow-xl max-w-sm">
    <div className="flex justify-between items-center mb-3">
      <h2 className="font-bold text-lg text-green-700">🌱 Smart Eco Greenhouse</h2>
      <div className="flex items-center space-x-2">
        {sensorData.loading && (
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        )}
        {sensorData.error && (
          <span className="text-red-500 text-xs">⚠️ API</span>
        )}
        <button 
          onClick={sensorData.refetch}
          className="text-blue-500 hover:text-blue-700 text-xs p-1 rounded hover:bg-blue-50"
          title="Refresh sensor data"
        >
          🔄
        </button>
      </div>
    </div>
    
    {/* API Connection Status */}
    <div className={`text-xs px-2 py-1 rounded-md mb-3 ${
      sensorData.error 
        ? 'bg-red-100 text-red-600' 
        : 'bg-green-100 text-green-600'
    }`}>
      {sensorData.error ? '🔴Live' : '🟢 Live API Data'}
      {sensorData.lastUpdated && (
        <span className="block text-gray-500 text-xs">
          Updated: {sensorData.lastUpdated}
        </span>
      )}
    </div>
    
    <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
      <div className="bg-red-100 p-2 rounded flex items-center gap-1">
        <Gauge className="w-3 h-3 text-red-500" />
        <span>{sensorData.temperature.toFixed(1)}°C</span>
      </div>
      <div className="bg-blue-100 p-2 rounded flex items-center gap-1">
        <Droplets className="w-3 h-3 text-blue-500" />
        <span>{sensorData.humidity.toFixed(0)}%</span>
      </div>
      <div className="bg-yellow-100 p-2 rounded flex items-center gap-1">
        <Sun className="w-3 h-3 text-yellow-500" />
        <span>{sensorData.solarOutput.toFixed(0)}%</span>
      </div>
      <div className="bg-green-100 p-2 rounded flex items-center gap-1">
        <Zap className="w-3 h-3 text-green-500" />
        <span>{sensorData.energyEfficiency.toFixed(0)}%</span>
      </div>
    </div>

    {/* Additional sensor metrics */}
    <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
      <div className="bg-cyan-100 p-2 rounded flex items-center gap-1">
        <Droplets className="w-3 h-3 text-cyan-500" />
        <span>Water: {sensorData.waterLevel.toFixed(0)}%</span>
      </div>
      <div className="bg-emerald-100 p-2 rounded flex items-center gap-1">
        <Wind className="w-3 h-3 text-emerald-500" />
        <span>CO₂: {sensorData.co2Saved.toFixed(1)}kg</span>
      </div>
    </div>

    <div className="space-y-2">
      <button
        onClick={() => setIsInside(!isInside)}
        className="w-full p-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors text-sm"
      >
        {isInside ? 'View Outside' : 'Go Inside'}
      </button>
      
      <button
        onClick={() => setActiveSpray(!activeSpray)}
        className={`w-full p-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-white ${
          activeSpray ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-400 hover:bg-blue-500'
        }`}
      >
        <Droplets className="w-4 h-4" />
        {activeSpray ? 'Stop Watering' : 'Start Watering'}
      </button>
      
      <div className="flex gap-2">
        <button
          onClick={() => setFanStatus(prev => ({ ...prev, intake: !prev.intake }))}
          className={`flex-1 p-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-white ${
            fanStatus.intake ? 'bg-green-500 hover:bg-green-600' : 'bg-green-400 hover:bg-green-500'
          }`}
        >
          <Wind className="w-4 h-4" />
          Intake
        </button>
        <button
          onClick={() => setFanStatus(prev => ({ ...prev, exhaust: !prev.exhaust }))}
          className={`flex-1 p-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-white ${
            fanStatus.exhaust ? 'bg-green-500 hover:bg-green-600' : 'bg-green-400 hover:bg-green-500'
          }`}
        >
          <Wind className="w-4 h-4" />
          Exhaust
        </button>
      </div>
    </div>
    
    {/* Quick stats */}
    <div className="mt-3 p-2 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-600 text-center">
        🌿 {36} Plants Growing | ⚡ Smart Controls Active
      </p>
    </div>
  </div>
);

export default Greenhouse;