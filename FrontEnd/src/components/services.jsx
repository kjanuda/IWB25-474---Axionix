import React from 'react';
import { Home, Cog, Leaf, Wrench } from 'lucide-react';


import image1 from './images/1.jpg';
import image2 from './images/2.jpg';
import image3 from './images/3.jpg';
import image4 from './images/4.jpg';


const Services = () => {
  const services = [
    {
      id: 1,
      icon: <Home className="w-12 h-12 text-white mb-4" />,
      title: "Greenhouse Solutions",
      subtitle: "Grow Beyond Boundaries",
      image: image1
    },
    {
      id: 2,
      icon: <Cog className="w-12 h-12 text-white mb-4" />,
      title: "Equipments",
      subtitle: "Smart Farming Essentials",
      image: image2
    },
    {
      id: 3,
      icon: <Leaf className="w-12 h-12 text-white mb-4" />,
      title: "Fresh Produce",
      subtitle: "Nature's Finest Produce",
      image: image3
    },
    {
      id: 4,
      icon: <Wrench className="w-12 h-12 text-white mb-4" />,
      title: "Services",
      subtitle: "Expert Agricultural Services",
      image: image4
    }
  ];

  return (
    <div className="w-full py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className="relative group overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
            >
              {/* Background Image */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                style={{
                  backgroundImage: `url(${service.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              />
              
              {/* Dark Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-50 group-hover:bg-opacity-60 transition-all duration-300" />
              
              {/* Content */}
              <div className="relative z-10 p-8 h-80 flex flex-col justify-between text-white">
                {/* Top Section with Icon */}
                <div className="flex flex-col items-start">
                  {service.icon}
                  <h3 className="text-2xl font-bold mb-2 group-hover:text-green-400 transition-colors duration-300">
                    {service.title}
                  </h3>
                  <p className="text-gray-200 text-sm font-medium">
                    {service.subtitle}
                  </p>
                </div>
                
                {/* Bottom Section with Button */}
                <div className="mt-auto">
                  <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                    Discover
                  </button>
                </div>
              </div>
              
              {/* Hover Effect Border */}
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-green-400 rounded-xl transition-all duration-300" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Services;