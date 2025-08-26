import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Droplets, Wind, Sun, Thermometer, Activity } from 'lucide-react';

// Real sensor data from Ballerina API
const useSensorData = () => {
  const [data, setData] = useState({
    temperature: 22.5,
    humidity: 68,
    soilMoisture: 65,
    lightLevel: 850,
    plantHealth: 85,
    waterLevel: 78,
    energyUsage: 2.4
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSensorData = async () => {
    try {
      const response = await fetch('http://192.168.8.106:8081/ecosense');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const apiData = await response.json();
      
      // Map API response to our expected format
      setData({
        temperature: apiData.temperature || 22.5,
        humidity: apiData.humidity || 68,
        soilMoisture: apiData.soilMoisture || 65,
        lightLevel: apiData.lightLevel || 850,
        plantHealth: apiData.plantHealth || 85,
        waterLevel: apiData.waterLevel || 78,
        energyUsage: apiData.energyUsage || 2.4
      });
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch sensor data:', err);
      setError(err.message);
      // Keep using the previous data if there's an error
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensorData(); // Initial fetch
    
    const interval = setInterval(() => {
      fetchSensorData();
    }, 5000); // Fetch every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
};

// Natural environment with realistic grass field layout
const NatureEnvironment = () => {
  return (
    <group>
      {/* Main grass field base */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshLambertMaterial color="#2E7D32" />
      </mesh>
      
      {/* Layered grass field sections */}
      {/* Front grass field */}
      <mesh position={[0, -0.48, 30]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[80, 40]} />
        <meshLambertMaterial color="#4CAF50" />
      </mesh>
      
      {/* Left grass field */}
      <mesh position={[-35, -0.48, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[50, 60]} />
        <meshLambertMaterial color="#66BB6A" />
      </mesh>
      
      {/* Right grass field */}
      <mesh position={[35, -0.48, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[50, 60]} />
        <meshLambertMaterial color="#4CAF50" />
      </mesh>
      
      {/* Back grass field */}
      <mesh position={[0, -0.48, -30]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[60, 30]} />
        <meshLambertMaterial color="#388E3C" />
      </mesh>

      {/* Dirt pathways through grass */}
      <mesh position={[0, -0.45, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[4, 80]} />
        <meshLambertMaterial color="#8D6E63" />
      </mesh>
      <mesh position={[0, -0.45, 0]} rotation={[-Math.PI/2, Math.PI/2, 0]}>
        <planeGeometry args={[4, 60]} />
        <meshLambertMaterial color="#8D6E63" />
      </mesh>

      {/* Scattered grass patches for natural look */}
      {Array.from({length: 15}).map((_, i) => {
        const x = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100;
        const size = 3 + Math.random() * 4;
        const grassColors = ['#43A047', '#4CAF50', '#66BB6A', '#81C784'];
        return (
          <mesh key={i} position={[x, -0.47, z]} rotation={[-Math.PI/2, 0, 0]}>
            <circleGeometry args={[size]} />
            <meshLambertMaterial color={grassColors[Math.floor(Math.random() * grassColors.length)]} />
          </mesh>
        );
      })}

      {/* Trees positioned around grass fields */}
      {[
        {pos: [-45, 0, -25], scale: 1.3},
        {pos: [42, 0, -28], scale: 1.6},
        {pos: [-38, 0, 35], scale: 1.2},
        {pos: [45, 0, 32], scale: 1.4},
        {pos: [-25, 0, 45], scale: 1.1},
        {pos: [35, 0, -45], scale: 1.5},
        {pos: [0, 0, -50], scale: 1.3},
        {pos: [-50, 0, 0], scale: 1.2}
      ].map((tree, i) => (
        <group key={i} position={tree.pos} scale={tree.scale}>
          {/* Tree trunk */}
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.5, 0.8, 4]} />
            <meshLambertMaterial color="#5D4037" />
          </mesh>
          {/* Tree foliage layers */}
          <mesh position={[0, 5, 0]}>
            <sphereGeometry args={[3]} />
            <meshLambertMaterial color="#2E7D32" />
          </mesh>
          <mesh position={[0, 7, 0]}>
            <sphereGeometry args={[2.5]} />
            <meshLambertMaterial color="#388E3C" />
          </mesh>
        </group>
      ))}

      {/* Bushes scattered across grass fields */}
      {Array.from({length: 18}).map((_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const radius = 25 + Math.random() * 15;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        return (
          <mesh key={i} position={[x, 0.3, z]}>
            <sphereGeometry args={[0.8 + Math.random() * 0.7]} />
            <meshLambertMaterial color="#66BB6A" />
          </mesh>
        );
      })}

      {/* Wildflowers in grass fields */}
      {Array.from({length: 35}).map((_, i) => {
        const x = (Math.random() - 0.5) * 90;
        const z = (Math.random() - 0.5) * 90;
        const colors = ['#FF5722', '#E91E63', '#9C27B0', '#FFD54F', '#FF9800'];
        return (
          <mesh key={i} position={[x, 0.1, z]}>
            <sphereGeometry args={[0.08]} />
            <meshLambertMaterial color={colors[Math.floor(Math.random() * colors.length)]} />
          </mesh>
        );
      })}

      {/* Tall grass clusters */}
      {Array.from({length: 25}).map((_, i) => {
        const x = (Math.random() - 0.5) * 80;
        const z = (Math.random() - 0.5) * 80;
        return (
          <group key={i} position={[x, 0, z]}>
            {Array.from({length: 5}).map((_, j) => (
              <mesh key={j} position={[(Math.random() - 0.5) * 0.5, 0.3, (Math.random() - 0.5) * 0.5]}>
                <cylinderGeometry args={[0.01, 0.01, 0.6]} />
                <meshLambertMaterial color="#4CAF50" />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Sky dome */}
      <mesh>
        <sphereGeometry args={[100, 32, 16]} />
        <meshBasicMaterial color="#87CEEB" side={THREE.BackSide} />
      </mesh>

      {/* Clouds */}
      {Array.from({length: 10}).map((_, i) => (
        <group key={i} position={[
          (Math.random() - 0.5) * 80,
          30 + Math.random() * 15,
          (Math.random() - 0.5) * 80
        ]}>
          {[0, 1, 2].map(j => (
            <mesh key={j} position={[j * 2, 0, 0]}>
              <sphereGeometry args={[2 + Math.random()]} />
              <meshBasicMaterial color="#FFFFFF" transparent opacity={0.7} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

// Enhanced irrigation with realistic water droplets
const IrrigationSystem = ({ active, waterLevel }) => {
  const sprayRef = useRef();
  const dropletsRef = useRef();
  
  useFrame((state) => {
    if (sprayRef.current && active) {
      // Animate spray nozzles
      sprayRef.current.children.forEach((spray, i) => {
        const time = state.clock.elapsedTime * 4 + i * 0.5;
        spray.position.y = 6.5 + Math.sin(time) * 0.3;
        spray.material.opacity = 0.8;
      });
    }

    // Animate water droplets
    if (dropletsRef.current && active) {
      dropletsRef.current.children.forEach((droplet, i) => {
        const time = state.clock.elapsedTime * 2 + i * 0.1;
        droplet.position.y = 6 - (time % 6);
        droplet.position.x += Math.sin(time) * 0.05;
        droplet.position.z += Math.cos(time) * 0.05;
        droplet.material.opacity = droplet.position.y > 0.6 ? 0.6 : 0;
      });
    }
  });

  return (
    <group>
      {/* Water pipes */}
      <mesh position={[0, 6.8, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 14]} />
        <meshLambertMaterial color="#2196F3" />
      </mesh>
      
      {[-4, 0, 4].map((z, i) => (
        <mesh key={i} position={[0, 6.8, z]} rotation={[0, 0, Math.PI/2]}>
          <cylinderGeometry args={[0.03, 0.03, 12]} />
          <meshLambertMaterial color="#2196F3" />
        </mesh>
      ))}

      {/* Spray nozzles */}
      <group ref={sprayRef}>
        {Array.from({length: 24}).map((_, i) => {
          const x = (i % 6 - 2.5) * 2.4;
          const z = (Math.floor(i / 6) - 1.5) * 2.4;
          return (
            <mesh key={i} position={[x, 6.5, z]}>
              <sphereGeometry args={[0.03]} />
              <meshBasicMaterial color="#4FC3F7" transparent opacity={active ? 0.8 : 0} />
            </mesh>
          );
        })}
      </group>

      {/* Realistic water droplets */}
      <group ref={dropletsRef}>
        {Array.from({length: 100}).map((_, i) => {
          const x = (Math.random() - 0.5) * 12;
          const z = (Math.random() - 0.5) * 8;
          return (
            <mesh key={i} position={[x, 6, z]}>
              <sphereGeometry args={[0.02]} />
              <meshBasicMaterial color="#4FC3F7" transparent opacity={0} />
            </mesh>
          );
        })}
      </group>

      {/* Water tank */}
      <mesh position={[-8, 4, 6]}>
        <cylinderGeometry args={[0.8, 0.8, 2]} />
        <meshLambertMaterial color="#90A4AE" />
      </mesh>
      <mesh position={[-8, 4 - (1 - waterLevel/100), 6]}>
        <cylinderGeometry args={[0.75, 0.75, 2 * waterLevel/100]} />
        <meshLambertMaterial color="#2196F3" transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

// Greenhouse structure
const GreenhouseStructure = ({ children }) => {
  return (
    <group>
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[16, 0.4, 12]} />
        <meshLambertMaterial color="#8D6E63" />
      </mesh>
      
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[15.5, 0.1, 11.5]} />
        <meshLambertMaterial color="#C8E6C9" />
      </mesh>

      {/* Glass walls */}
      {[
        { pos: [0, 3, -5.75], size: [15, 6, 0.1] },
        { pos: [0, 3, 5.75], size: [15, 6, 0.1] },
        { pos: [-7.75, 3, 0], size: [0.1, 6, 11.5] },
        { pos: [7.75, 3, 0], size: [0.1, 6, 11.5] }
      ].map((wall, i) => (
        <mesh key={i} position={wall.pos}>
          <boxGeometry args={wall.size} />
          <meshLambertMaterial color="#E3F2FD" transparent opacity={0.3} />
        </mesh>
      ))}

      {/* Arched roof */}
      {Array.from({length: 15}).map((_, i) => {
        const angle = (i / 14) * Math.PI;
        const y = Math.sin(angle) * 5 + 6;
        const z = Math.cos(angle) * 5.5;
        return (
          <mesh key={i} position={[0, y, z]} rotation={[angle, 0, 0]}>
            <boxGeometry args={[15, 0.1, 0.6]} />
            <meshLambertMaterial color="#E3F2FD" transparent opacity={0.4} />
          </mesh>
        );
      })}

      {children}
    </group>
  );
};

// Plant beds with growth animation
const PlantBeds = ({ wateringActive, soilMoisture, plantHealth }) => {
  const plantsRef = useRef();
  
  useFrame((state) => {
    if (plantsRef.current) {
      plantsRef.current.children.forEach((plant, i) => {
        const sway = Math.sin(state.clock.elapsedTime * 0.8 + i * 0.3) * 0.02;
        plant.rotation.z = sway;
        
        if (wateringActive) {
          const growth = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
          plant.scale.setScalar(growth);
        }
      });
    }
  });

  const plantTypes = [
    { color: '#4CAF50', height: 0.6 },
    { color: '#8BC34A', height: 0.4 },
    { color: '#66BB6A', height: 0.8 },
    { color: '#A5D6A7', height: 0.3 }
  ];

  return (
    <group ref={plantsRef}>
      {[-6, -2, 2, 6].map((x, bedIndex) => (
        <group key={bedIndex}>
          <mesh position={[x, 0.3, 0]}>
            <boxGeometry args={[3, 0.6, 10]} />
            <meshLambertMaterial color="#8D6E63" />
          </mesh>
          
          <mesh position={[x, 0.5, 0]}>
            <boxGeometry args={[2.8, 0.2, 9.8]} />
            <meshLambertMaterial color={soilMoisture > 60 ? "#5D4037" : "#6D4C41"} />
          </mesh>

          {Array.from({length: 10}).map((_, plantIndex) => {
            const plantType = plantTypes[bedIndex];
            const z = (plantIndex - 4.5) * 1;
            const health = plantHealth / 100;
            
            return (
              <group key={plantIndex} position={[x, 0.6, z]}>
                <mesh>
                  <cylinderGeometry args={[0.02, 0.02, plantType.height * health]} />
                  <meshLambertMaterial color="#4A5D23" />
                </mesh>
                
                <mesh position={[0, plantType.height * health * 0.7, 0]}>
                  <sphereGeometry args={[0.15 * health]} />
                  <meshLambertMaterial color={plantType.color} />
                </mesh>
                
                {bedIndex === 0 && health > 0.8 && (
                  <mesh position={[0, plantType.height * health * 0.5, 0]}>
                    <sphereGeometry args={[0.05]} />
                    <meshLambertMaterial color="#F44336" />
                  </mesh>
                )}
              </group>
            );
          })}
        </group>
      ))}
    </group>
  );
};

// Climate control
const ClimateControl = ({ fanSpeed, heaterOn }) => {
  const fanRef = useRef();
  
  useFrame(() => {
    if (fanRef.current) {
      fanRef.current.rotation.z += fanSpeed * 0.3;
    }
  });

  return (
    <group>
      {[{pos: [-7.5, 5, 0]}, {pos: [7.5, 5, 0]}].map((fan, i) => (
        <group key={i} position={fan.pos}>
          <mesh>
            <cylinderGeometry args={[0.4, 0.4, 0.2]} />
            <meshLambertMaterial color="#37474F" />
          </mesh>
          <group ref={i === 0 ? fanRef : null}>
            {[0, 1, 2].map(blade => (
              <mesh key={blade} rotation={[0, 0, blade * Math.PI * 2/3]} position={[0.25, 0, 0]}>
                <boxGeometry args={[0.3, 0.05, 0.02]} />
                <meshLambertMaterial color="#546E7A" />
              </mesh>
            ))}
          </group>
        </group>
      ))}

      <mesh position={[6, 1, -5]}>
        <boxGeometry args={[1.5, 1.5, 0.3]} />
        <meshLambertMaterial color={heaterOn ? "#FF5722" : "#424242"} />
      </mesh>
    </group>
  );
};

// LED grow lights
const GrowLights = ({ isOn }) => {
  const lightsRef = useRef();
  
  useFrame((state) => {
    if (lightsRef.current && isOn) {
      const intensity = 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
      lightsRef.current.children.forEach(light => {
        light.material.opacity = intensity;
      });
    }
  });

  return (
    <group ref={lightsRef}>
      {Array.from({length: 6}).map((_, i) => {
        const x = (i % 3 - 1) * 4;
        const z = Math.floor(i / 3) * 4 - 2;
        return (
          <group key={i} position={[x, 5.5, z]}>
            <mesh>
              <boxGeometry args={[2, 0.1, 0.3]} />
              <meshLambertMaterial color="#E1BEE7" />
            </mesh>
            <mesh position={[0, -0.1, 0]}>
              <boxGeometry args={[1.8, 0.05, 0.2]} />
              <meshBasicMaterial color={isOn ? "#9C27B0" : "#424242"} transparent opacity={isOn ? 0.8 : 0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// Main component
const SmartGreenhouse = () => {
  const [activeSpray, setActiveSpray] = useState(false);
  const [fanSpeed, setFanSpeed] = useState(0.5);
  const [heaterOn, setHeaterOn] = useState(false);
  const [lightsOn, setLightsOn] = useState(true);
  const [autoMode, setAutoMode] = useState(false);
  const { data: sensorData, loading, error } = useSensorData();

  useEffect(() => {
    if (autoMode) {
      setActiveSpray(sensorData.soilMoisture < 50);
      setFanSpeed(sensorData.temperature > 25 ? 1 : 0.3);
      setHeaterOn(sensorData.temperature < 20);
      setLightsOn(sensorData.lightLevel < 600);
    }
  }, [autoMode, sensorData]);

  return (
    <div className="w-full h-screen bg-gradient-to-b from-sky-300 to-green-200 relative">
      <Canvas camera={{ position: [25, 20, 25], fov: 60 }} shadows>
        <ambientLight intensity={0.4} />
        <directionalLight position={[50, 50, 25]} intensity={1.2} castShadow />
        <pointLight position={[0, 10, 0]} intensity={0.8} color="#FFF8DC" />
        
        <NatureEnvironment />
        
        <GreenhouseStructure>
          <IrrigationSystem active={activeSpray} waterLevel={sensorData.waterLevel} />
          <PlantBeds 
            wateringActive={activeSpray} 
            soilMoisture={sensorData.soilMoisture}
            plantHealth={sensorData.plantHealth}
          />
          <ClimateControl fanSpeed={fanSpeed} heaterOn={heaterOn} />
          <GrowLights isOn={lightsOn} />
        </GreenhouseStructure>

        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>

      {/* Control Panel */}
      <div className="absolute top-4 left-4 bg-white p-4 rounded-xl shadow-lg max-w-xs">
        <h2 className="font-bold text-lg mb-3 text-green-700">🌱 Smart Greenhouse</h2>
        
        {loading && <div className="text-sm text-gray-500 mb-2">Loading sensor data...</div>}
        {error && <div className="text-sm text-red-500 mb-2">Error: {error}</div>}
        
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="bg-red-50 p-2 rounded flex items-center gap-1">
            <Thermometer className="w-3 h-3 text-red-500" />
            <span>{sensorData.temperature.toFixed(1)}°C</span>
          </div>
          <div className="bg-blue-50 p-2 rounded flex items-center gap-1">
            <Droplets className="w-3 h-3 text-blue-500" />
            <span>{sensorData.humidity.toFixed(0)}%</span>
          </div>
          <div className="bg-green-50 p-2 rounded flex items-center gap-1">
            <Activity className="w-3 h-3 text-green-500" />
            <span>{sensorData.plantHealth.toFixed(0)}%</span>
          </div>
          <div className="bg-yellow-50 p-2 rounded flex items-center gap-1">
            <Sun className="w-3 h-3 text-yellow-500" />
            <span>{sensorData.lightLevel.toFixed(0)} lux</span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => setAutoMode(!autoMode)}
            className={`w-full p-2 rounded-lg transition-colors ${
              autoMode ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {autoMode ? 'Auto Mode ON' : 'Manual Mode'}
          </button>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveSpray(!activeSpray)}
              className={`p-2 rounded-lg flex items-center gap-1 text-white ${
                activeSpray ? 'bg-blue-500' : 'bg-blue-400'
              }`}
              disabled={autoMode}
            >
              <Droplets className="w-4 h-4" />
              Water
            </button>
            
            <button
              onClick={() => setLightsOn(!lightsOn)}
              className={`p-2 rounded-lg flex items-center gap-1 text-white ${
                lightsOn ? 'bg-purple-500' : 'bg-purple-400'
              }`}
              disabled={autoMode}
            >
              <Sun className="w-4 h-4" />
              Lights
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setHeaterOn(!heaterOn)}
              className={`p-2 rounded-lg text-white ${
                heaterOn ? 'bg-red-500' : 'bg-red-400'
              }`}
              disabled={autoMode}
            >
              Heat
            </button>
            
            <button
              onClick={() => setFanSpeed(fanSpeed > 0.5 ? 0.3 : 1)}
              className={`p-2 rounded-lg flex items-center gap-1 text-white ${
                fanSpeed > 0.5 ? 'bg-green-500' : 'bg-green-400'
              }`}
              disabled={autoMode}
            >
              <Wind className="w-4 h-4" />
              Fan
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-600">
          <div>Soil: {sensorData.soilMoisture.toFixed(0)}% | Water: {sensorData.waterLevel.toFixed(0)}%</div>
          <div>Energy: {sensorData.energyUsage.toFixed(1)}kW</div>
        </div>
      </div>
    </div>
  );
};

export default SmartGreenhouse;
