/**
 * 20 Unique House Profiles
 * Each has distinct energy production/consumption behavior patterns
 */
const HOUSE_PROFILES = [
  {
    name: "Solar Farm Villa",      type: "high_producer",
    lat: 37.774, lng: -122.419,   baseProd: 8.5,  baseConsump: 2.1,
    solarMultiplier: 2.0,          loadMultiplier: 0.8,
    description: "Large solar array, minimal consumption",
  },
  {
    name: "Green Cottage",         type: "balanced",
    lat: 37.780, lng: -122.412,   baseProd: 4.2,  baseConsump: 3.8,
    solarMultiplier: 1.3,          loadMultiplier: 1.0,
    description: "Small solar, moderate family usage",
  },
  {
    name: "Tech Hub Office",       type: "high_consumer",
    lat: 37.785, lng: -122.405,   baseProd: 3.0,  baseConsump: 9.5,
    solarMultiplier: 0.8,          loadMultiplier: 2.2,
    description: "Servers and workstations, small rooftop solar",
  },
  {
    name: "Eco Townhouse",         type: "producer",
    lat: 37.778, lng: -122.398,   baseProd: 6.0,  baseConsump: 2.8,
    solarMultiplier: 1.5,          loadMultiplier: 0.9,
    description: "Premium solar + battery storage",
  },
  {
    name: "Family Ranch",          type: "balanced",
    lat: 37.765, lng: -122.425,   baseProd: 5.0,  baseConsump: 5.2,
    solarMultiplier: 1.2,          loadMultiplier: 1.3,
    description: "Large family, good solar coverage",
  },
  {
    name: "Apartment Complex",     type: "high_consumer",
    lat: 37.790, lng: -122.418,   baseProd: 2.0,  baseConsump: 12.0,
    solarMultiplier: 0.5,          loadMultiplier: 2.8,
    description: "Multi-unit, limited rooftop, high demand",
  },
  {
    name: "Smart Home Alpha",      type: "efficient",
    lat: 37.772, lng: -122.407,   baseProd: 5.5,  baseConsump: 2.5,
    solarMultiplier: 1.4,          loadMultiplier: 0.7,
    description: "IoT-optimized, high solar, smart consumption",
  },
  {
    name: "Workshop & Studio",     type: "variable_consumer",
    lat: 37.768, lng: -122.432,   baseProd: 3.8,  baseConsump: 7.0,
    solarMultiplier: 1.0,          loadMultiplier: 1.8,
    description: "Creative studio with power-hungry equipment",
  },
  {
    name: "Hilltop Estate",        type: "high_producer",
    lat: 37.795, lng: -122.395,   baseProd: 9.0,  baseConsump: 3.5,
    solarMultiplier: 1.8,          loadMultiplier: 1.0,
    description: "South-facing roof, massive solar array",
  },
  {
    name: "Corner Bakery",         type: "consumer",
    lat: 37.760, lng: -122.415,   baseProd: 1.5,  baseConsump: 8.5,
    solarMultiplier: 0.4,          loadMultiplier: 2.0,
    description: "Commercial ovens and refrigeration",
  },
  {
    name: "Riverside Cabin",       type: "minimal",
    lat: 37.750, lng: -122.440,   baseProd: 2.5,  baseConsump: 1.2,
    solarMultiplier: 0.9,          loadMultiplier: 0.5,
    description: "Off-grid lifestyle, small panels",
  },
  {
    name: "Suburban Twin",         type: "balanced",
    lat: 37.783, lng: -122.422,   baseProd: 4.0,  baseConsump: 4.3,
    solarMultiplier: 1.1,          loadMultiplier: 1.1,
    description: "Standard suburban home",
  },
  {
    name: "Electric Car Garage",   type: "ev_heavy",
    lat: 37.770, lng: -122.428,   baseProd: 5.5,  baseConsump: 8.0,
    solarMultiplier: 1.4,          loadMultiplier: 2.0,
    description: "3 EVs charging, large solar to compensate",
  },
  {
    name: "Research Lab",          type: "steady_consumer",
    lat: 37.787, lng: -122.400,   baseProd: 4.0,  baseConsump: 11.0,
    solarMultiplier: 1.0,          loadMultiplier: 2.5,
    description: "24/7 equipment operation",
  },
  {
    name: "Garden Greenhouse",     type: "producer",
    lat: 37.758, lng: -122.434,   baseProd: 7.5,  baseConsump: 3.2,
    solarMultiplier: 1.7,          loadMultiplier: 0.8,
    description: "Transparent solar panels on greenhouse roof",
  },
  {
    name: "Mountain View Loft",    type: "efficient",
    lat: 37.793, lng: -122.408,   baseProd: 6.2,  baseConsump: 2.0,
    solarMultiplier: 1.6,          loadMultiplier: 0.6,
    description: "Passive house design, excellent insulation",
  },
  {
    name: "Night Shift Household", type: "shifted",
    lat: 37.763, lng: -122.420,   baseProd: 3.0,  baseConsump: 6.0,
    solarMultiplier: 0.8,          loadMultiplier: 1.5,
    description: "Night workers, high evening consumption",
  },
  {
    name: "Hydro Micro Plant",     type: "constant_producer",
    lat: 37.755, lng: -122.437,   baseProd: 10.0, baseConsump: 2.8,
    solarMultiplier: 0.3,          loadMultiplier: 0.7,
    description: "Stream-powered micro turbine, consistent output",
  },
  {
    name: "Urban Rooftop Farm",    type: "prosumer",
    lat: 37.788, lng: -122.413,   baseProd: 5.8,  baseConsump: 4.5,
    solarMultiplier: 1.35,         loadMultiplier: 1.1,
    description: "Rooftop garden with solar panels",
  },
  {
    name: "Community Center",      type: "variable_consumer",
    lat: 37.775, lng: -122.402,   baseProd: 3.5,  baseConsump: 9.0,
    solarMultiplier: 0.9,          loadMultiplier: 2.1,
    description: "Events hall, kitchen, HVAC-heavy",
  },
];

module.exports = { HOUSE_PROFILES };
