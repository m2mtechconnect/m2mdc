/**
 * Transport Canada National Multimodal Operations Twin - Synthetic Data
 * Comprehensive mock data for Aviation, Rail, Marine, Road, Border, and Weather domains
 */

// ============ Reference Data Types ============

export interface Airport {
  id: string;
  name: string;
  region: string;
  weather_region: string;
  runways: number;
  daily_flights: number;
}

export interface Flight {
  id: string;
  origin: string;
  destination: string;
  airline: string;
  scheduled_dep: string;
  actual_dep: string;
  delay_minutes: number;
  risk_level: 'low' | 'medium' | 'high';
  cause?: string;
}

export interface RailTrain {
  id: string;
  operator: string;
  route: string;
  speed_kmh: number;
  brake_temp_c: number;
  axle_load_tonnes: number;
  cargo_type: string;
  risk_level: 'low' | 'medium' | 'high';
}

export interface HighwaySegment {
  id: string;
  name: string;
  region: string;
  avg_speed_kmh: number;
  volume_veh_per_hour: number;
  incidents_24h: number;
  congestion_level: 'low' | 'medium' | 'high';
}

export interface BorderCrossing {
  id: string;
  name: string;
  region: string;
  truck_wait_min: number;
  passenger_wait_min: number;
  lanes_open: number;
  total_lanes: number;
  congestion_level: 'low' | 'medium' | 'high';
}

export interface MarineVessel {
  id: string;
  name: string;
  type: string;
  port: string;
  eta_hours: number;
  cargo_type: string;
  congestion_level: 'low' | 'medium' | 'high';
}

export interface WeatherRegion {
  id: string;
  name: string;
  visibility_km: number;
  wind_kts: number;
  precip_type: 'none' | 'rain' | 'snow' | 'fog' | 'ice';
  temp_c: number;
  alert_level: 'none' | 'advisory' | 'warning' | 'emergency';
}

// ============ Seed Data ============

export const AIRPORTS: Airport[] = [
  { id: 'YVR', name: 'Vancouver International Airport', region: 'BC', weather_region: 'BC_SouthCoast', runways: 3, daily_flights: 450 },
  { id: 'YYZ', name: 'Toronto Pearson International', region: 'ON', weather_region: 'ON_GTA', runways: 5, daily_flights: 1200 },
  { id: 'YUL', name: 'Montreal-Trudeau International', region: 'QC', weather_region: 'QC_Montreal', runways: 3, daily_flights: 550 },
  { id: 'YYC', name: 'Calgary International Airport', region: 'AB', weather_region: 'AB_South', runways: 4, daily_flights: 400 },
  { id: 'YEG', name: 'Edmonton International Airport', region: 'AB', weather_region: 'AB_Central', runways: 2, daily_flights: 280 },
  { id: 'YOW', name: 'Ottawa International Airport', region: 'ON', weather_region: 'ON_Ottawa', runways: 3, daily_flights: 180 },
  { id: 'YWG', name: 'Winnipeg James A Richardson', region: 'MB', weather_region: 'MB_South', runways: 3, daily_flights: 150 },
  { id: 'YHZ', name: 'Halifax Stanfield International', region: 'NS', weather_region: 'NS_Halifax', runways: 2, daily_flights: 120 },
];

export const FLIGHTS: Flight[] = [
  { id: 'AC145', origin: 'YVR', destination: 'YYZ', airline: 'Air Canada', scheduled_dep: '08:00', actual_dep: '08:32', delay_minutes: 32, risk_level: 'medium', cause: 'snow' },
  { id: 'WS220', origin: 'YYZ', destination: 'YVR', airline: 'WestJet', scheduled_dep: '09:15', actual_dep: '09:20', delay_minutes: 5, risk_level: 'low' },
  { id: 'AC867', origin: 'YUL', destination: 'YYC', airline: 'Air Canada', scheduled_dep: '10:30', actual_dep: '11:45', delay_minutes: 75, risk_level: 'high', cause: 'de-icing' },
  { id: 'WS442', origin: 'YYC', destination: 'YEG', airline: 'WestJet', scheduled_dep: '11:00', actual_dep: '11:08', delay_minutes: 8, risk_level: 'low' },
  { id: 'AC101', origin: 'YYZ', destination: 'YUL', airline: 'Air Canada', scheduled_dep: '07:00', actual_dep: '07:00', delay_minutes: 0, risk_level: 'low' },
  { id: 'TS789', origin: 'YUL', destination: 'YVR', airline: 'Air Transat', scheduled_dep: '14:00', actual_dep: '14:55', delay_minutes: 55, risk_level: 'medium', cause: 'crew availability' },
  { id: 'AC303', origin: 'YOW', destination: 'YYZ', airline: 'Air Canada', scheduled_dep: '06:30', actual_dep: '06:35', delay_minutes: 5, risk_level: 'low' },
  { id: 'WS678', origin: 'YWG', destination: 'YYC', airline: 'WestJet', scheduled_dep: '12:15', actual_dep: '13:00', delay_minutes: 45, risk_level: 'medium', cause: 'weather' },
];

export const RAIL_TRAINS: RailTrain[] = [
  { id: 'CN8745', operator: 'CN Rail', route: 'Prince George → Vancouver', speed_kmh: 92, brake_temp_c: 430, axle_load_tonnes: 32.5, cargo_type: 'Intermodal', risk_level: 'high' },
  { id: 'VIA12', operator: 'VIA Rail', route: 'Toronto → Montreal', speed_kmh: 145, brake_temp_c: 285, axle_load_tonnes: 18.2, cargo_type: 'Passenger', risk_level: 'low' },
  { id: 'CP3421', operator: 'CP Rail', route: 'Calgary → Vancouver', speed_kmh: 88, brake_temp_c: 380, axle_load_tonnes: 33.0, cargo_type: 'Grain', risk_level: 'medium' },
  { id: 'CN5567', operator: 'CN Rail', route: 'Edmonton → Winnipeg', speed_kmh: 95, brake_temp_c: 295, axle_load_tonnes: 31.8, cargo_type: 'Oil/Petroleum', risk_level: 'low' },
  { id: 'VIA67', operator: 'VIA Rail', route: 'Ottawa → Toronto', speed_kmh: 152, brake_temp_c: 270, axle_load_tonnes: 17.5, cargo_type: 'Passenger', risk_level: 'low' },
  { id: 'CP7890', operator: 'CP Rail', route: 'Montreal → Halifax', speed_kmh: 78, brake_temp_c: 445, axle_load_tonnes: 34.2, cargo_type: 'Containers', risk_level: 'high' },
  { id: 'CN2234', operator: 'CN Rail', route: 'Saskatoon → Thunder Bay', speed_kmh: 85, brake_temp_c: 315, axle_load_tonnes: 32.0, cargo_type: 'Potash', risk_level: 'low' },
  { id: 'VIA42', operator: 'VIA Rail', route: 'Vancouver → Jasper', speed_kmh: 68, brake_temp_c: 260, axle_load_tonnes: 19.0, cargo_type: 'Passenger', risk_level: 'low' },
];

export const HIGHWAY_SEGMENTS: HighwaySegment[] = [
  { id: 'HWY401_TO', name: 'Highway 401 Toronto', region: 'ON', avg_speed_kmh: 75, volume_veh_per_hour: 12500, incidents_24h: 8, congestion_level: 'high' },
  { id: 'HWY1_VAN', name: 'Trans-Canada Hwy Vancouver', region: 'BC', avg_speed_kmh: 95, volume_veh_per_hour: 4200, incidents_24h: 2, congestion_level: 'medium' },
  { id: 'HWY2_AB', name: 'Highway 2 Alberta', region: 'AB', avg_speed_kmh: 110, volume_veh_per_hour: 3800, incidents_24h: 1, congestion_level: 'low' },
  { id: 'HWY20_QC', name: 'Autoroute 20 Quebec', region: 'QC', avg_speed_kmh: 88, volume_veh_per_hour: 6500, incidents_24h: 4, congestion_level: 'medium' },
  { id: 'HWY417_OTT', name: 'Highway 417 Ottawa', region: 'ON', avg_speed_kmh: 92, volume_veh_per_hour: 5200, incidents_24h: 3, congestion_level: 'medium' },
  { id: 'HWY102_NS', name: 'Highway 102 Nova Scotia', region: 'NS', avg_speed_kmh: 105, volume_veh_per_hour: 2800, incidents_24h: 1, congestion_level: 'low' },
];

export const BORDER_CROSSINGS: BorderCrossing[] = [
  { id: 'WINDSOR', name: 'Windsor-Detroit (Ambassador Bridge)', region: 'ON', truck_wait_min: 45, passenger_wait_min: 25, lanes_open: 8, total_lanes: 12, congestion_level: 'high' },
  { id: 'PACIFIC', name: 'Pacific Highway (BC)', region: 'BC', truck_wait_min: 35, passenger_wait_min: 18, lanes_open: 6, total_lanes: 8, congestion_level: 'medium' },
  { id: 'CHAMPLAIN', name: 'Champlain-Lacolle (QC)', region: 'QC', truck_wait_min: 28, passenger_wait_min: 15, lanes_open: 5, total_lanes: 6, congestion_level: 'medium' },
  { id: 'NIAGARA', name: 'Niagara Falls (Peace Bridge)', region: 'ON', truck_wait_min: 52, passenger_wait_min: 30, lanes_open: 6, total_lanes: 10, congestion_level: 'high' },
  { id: 'EMERSON', name: 'Emerson (Manitoba)', region: 'MB', truck_wait_min: 18, passenger_wait_min: 10, lanes_open: 3, total_lanes: 4, congestion_level: 'low' },
];

export const MARINE_VESSELS: MarineVessel[] = [
  { id: 'MV_NORTHERN_STAR', name: 'MV Northern Star', type: 'Container Ship', port: 'Vancouver', eta_hours: 12, cargo_type: 'Containers', congestion_level: 'high' },
  { id: 'MV_PACIFIC_TRADER', name: 'MV Pacific Trader', type: 'Bulk Carrier', port: 'Vancouver', eta_hours: 8, cargo_type: 'Coal', congestion_level: 'medium' },
  { id: 'MV_ATLANTIC_VOYAGER', name: 'MV Atlantic Voyager', type: 'Container Ship', port: 'Halifax', eta_hours: 18, cargo_type: 'Containers', congestion_level: 'low' },
  { id: 'MV_ST_LAURENT', name: 'MV St. Laurent', type: 'Tanker', port: 'Montreal', eta_hours: 6, cargo_type: 'Petroleum', congestion_level: 'medium' },
  { id: 'MV_RUPERT_PRIDE', name: 'MV Rupert Pride', type: 'Bulk Carrier', port: 'Prince Rupert', eta_hours: 4, cargo_type: 'Grain', congestion_level: 'low' },
  { id: 'MV_GREAT_LAKES', name: 'MV Great Lakes', type: 'Laker', port: 'Thunder Bay', eta_hours: 24, cargo_type: 'Iron Ore', congestion_level: 'low' },
];

export const WEATHER_REGIONS: WeatherRegion[] = [
  { id: 'BC_SouthCoast', name: 'BC South Coast', visibility_km: 8, wind_kts: 25, precip_type: 'rain', temp_c: 8, alert_level: 'advisory' },
  { id: 'ON_GTA', name: 'Greater Toronto Area', visibility_km: 15, wind_kts: 12, precip_type: 'none', temp_c: 2, alert_level: 'none' },
  { id: 'QC_Montreal', name: 'Montreal Region', visibility_km: 5, wind_kts: 18, precip_type: 'snow', temp_c: -5, alert_level: 'warning' },
  { id: 'AB_South', name: 'Southern Alberta', visibility_km: 20, wind_kts: 8, precip_type: 'none', temp_c: -2, alert_level: 'none' },
  { id: 'AB_Central', name: 'Central Alberta', visibility_km: 12, wind_kts: 15, precip_type: 'snow', temp_c: -8, alert_level: 'advisory' },
  { id: 'MB_South', name: 'Southern Manitoba', visibility_km: 3, wind_kts: 35, precip_type: 'snow', temp_c: -15, alert_level: 'warning' },
  { id: 'NS_Halifax', name: 'Halifax Region', visibility_km: 2, wind_kts: 45, precip_type: 'fog', temp_c: 5, alert_level: 'warning' },
  { id: 'ON_Ottawa', name: 'Ottawa Region', visibility_km: 10, wind_kts: 14, precip_type: 'ice', temp_c: -1, alert_level: 'advisory' },
];

// ============ Simulation Event Types ============

export type TransportDomain = 'aviation' | 'rail' | 'marine' | 'road' | 'border' | 'weather' | 'regulatory';

export interface TransportEvent {
  id: string;
  domain: TransportDomain;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  details: Record<string, unknown>;
  label: string;
}

// ============ Event Generators ============

function generateId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateAviationEvents(count: number = 5): TransportEvent[] {
  const events: TransportEvent[] = [];
  const eventTypes = [
    { type: 'flight_delay', severity: 'medium' as const, label: 'Flight delay reported' },
    { type: 'runway_closure', severity: 'high' as const, label: 'Runway closure' },
    { type: 'weather_diversion', severity: 'high' as const, label: 'Weather diversion' },
    { type: 'notam_issued', severity: 'medium' as const, label: 'NOTAM issued' },
    { type: 'safety_incident', severity: 'critical' as const, label: 'Safety incident reported' },
    { type: 'ground_stop', severity: 'critical' as const, label: 'Ground stop initiated' },
  ];

  for (let i = 0; i < count; i++) {
    const flight = randomFromArray(FLIGHTS);
    const airport = randomFromArray(AIRPORTS);
    const eventType = randomFromArray(eventTypes);
    const hoursAgo = randomBetween(0, 24);

    events.push({
      id: generateId(),
      domain: 'aviation',
      event_type: eventType.type,
      severity: eventType.severity,
      timestamp: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
      label: eventType.label,
      details: {
        flight_id: flight.id,
        airline: flight.airline,
        airport: airport.id,
        airport_name: airport.name,
        delay_minutes: flight.delay_minutes,
        cause: flight.cause || 'operational',
        risk_score: Math.random() * 0.4 + 0.5,
      },
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function generateRailEvents(count: number = 5): TransportEvent[] {
  const events: TransportEvent[] = [];
  const eventTypes = [
    { type: 'brake_overheat', severity: 'high' as const, label: 'Brake overheat detected' },
    { type: 'speed_anomaly', severity: 'medium' as const, label: 'Speed anomaly detected' },
    { type: 'derailment_risk', severity: 'critical' as const, label: 'Derailment risk elevated' },
    { type: 'track_defect', severity: 'high' as const, label: 'Track defect reported' },
    { type: 'crossing_incident', severity: 'critical' as const, label: 'Crossing incident' },
    { type: 'hazmat_alert', severity: 'critical' as const, label: 'Hazmat cargo alert' },
  ];

  for (let i = 0; i < count; i++) {
    const train = randomFromArray(RAIL_TRAINS);
    const eventType = randomFromArray(eventTypes);
    const hoursAgo = randomBetween(0, 24);

    events.push({
      id: generateId(),
      domain: 'rail',
      event_type: eventType.type,
      severity: eventType.severity,
      timestamp: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
      label: eventType.label,
      details: {
        train_id: train.id,
        operator: train.operator,
        route: train.route,
        speed_kmh: train.speed_kmh,
        brake_temp_c: train.brake_temp_c,
        axle_load_tonnes: train.axle_load_tonnes,
        cargo_type: train.cargo_type,
        risk_score: train.risk_level === 'high' ? 0.85 : train.risk_level === 'medium' ? 0.55 : 0.25,
      },
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function generateMarineEvents(count: number = 4): TransportEvent[] {
  const events: TransportEvent[] = [];
  const eventTypes = [
    { type: 'port_congestion_spike', severity: 'high' as const, label: 'Port congestion spike' },
    { type: 'vessel_delay', severity: 'medium' as const, label: 'Vessel ETA delay' },
    { type: 'berth_unavailable', severity: 'high' as const, label: 'Berth unavailable' },
    { type: 'weather_hold', severity: 'medium' as const, label: 'Weather hold in effect' },
    { type: 'ais_anomaly', severity: 'critical' as const, label: 'AIS signal anomaly' },
  ];

  for (let i = 0; i < count; i++) {
    const vessel = randomFromArray(MARINE_VESSELS);
    const eventType = randomFromArray(eventTypes);
    const hoursAgo = randomBetween(0, 24);

    events.push({
      id: generateId(),
      domain: 'marine',
      event_type: eventType.type,
      severity: eventType.severity,
      timestamp: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
      label: eventType.label,
      details: {
        vessel_id: vessel.id,
        vessel_name: vessel.name,
        vessel_type: vessel.type,
        port: vessel.port,
        eta_hours: vessel.eta_hours,
        cargo_type: vessel.cargo_type,
        vessels_waiting: randomBetween(5, 20),
        eta_delay_hours: randomBetween(2, 12),
      },
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function generateRoadEvents(count: number = 4): TransportEvent[] {
  const events: TransportEvent[] = [];
  const eventTypes = [
    { type: 'multi_vehicle_collision', severity: 'critical' as const, label: 'Multi-vehicle collision' },
    { type: 'traffic_surge', severity: 'medium' as const, label: 'Traffic volume surge' },
    { type: 'lane_closure', severity: 'high' as const, label: 'Lane closure' },
    { type: 'hazmat_spill', severity: 'critical' as const, label: 'Hazmat spill reported' },
    { type: 'road_weather_advisory', severity: 'medium' as const, label: 'Road weather advisory' },
  ];

  for (let i = 0; i < count; i++) {
    const segment = randomFromArray(HIGHWAY_SEGMENTS);
    const eventType = randomFromArray(eventTypes);
    const hoursAgo = randomBetween(0, 24);

    events.push({
      id: generateId(),
      domain: 'road',
      event_type: eventType.type,
      severity: eventType.severity,
      timestamp: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
      label: eventType.label,
      details: {
        highway_segment: segment.id,
        highway_name: segment.name,
        region: segment.region,
        lanes_closed: randomBetween(1, 3),
        travel_time_increase_min: randomBetween(10, 60),
        volume_veh_per_hour: segment.volume_veh_per_hour,
        incidents_24h: segment.incidents_24h,
      },
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function generateBorderEvents(count: number = 3): TransportEvent[] {
  const events: TransportEvent[] = [];
  const eventTypes = [
    { type: 'truck_surge', severity: 'high' as const, label: 'Truck traffic surge' },
    { type: 'lane_closure', severity: 'medium' as const, label: 'Inspection lane closure' },
    { type: 'wait_time_spike', severity: 'high' as const, label: 'Wait time spike' },
    { type: 'system_outage', severity: 'critical' as const, label: 'CBSA system outage' },
  ];

  for (let i = 0; i < count; i++) {
    const crossing = randomFromArray(BORDER_CROSSINGS);
    const eventType = randomFromArray(eventTypes);
    const hoursAgo = randomBetween(0, 24);

    events.push({
      id: generateId(),
      domain: 'border',
      event_type: eventType.type,
      severity: eventType.severity,
      timestamp: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
      label: eventType.label,
      details: {
        crossing_id: crossing.id,
        crossing_name: crossing.name,
        region: crossing.region,
        truck_wait_min: crossing.truck_wait_min,
        passenger_wait_min: crossing.passenger_wait_min,
        lanes_open: crossing.lanes_open,
        total_lanes: crossing.total_lanes,
      },
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function generateWeatherEvents(count: number = 3): TransportEvent[] {
  const events: TransportEvent[] = [];
  const eventTypes = [
    { type: 'storm_warning', severity: 'critical' as const, label: 'Storm warning issued' },
    { type: 'fog_advisory', severity: 'high' as const, label: 'Dense fog advisory' },
    { type: 'winter_storm', severity: 'critical' as const, label: 'Winter storm warning' },
    { type: 'wind_advisory', severity: 'medium' as const, label: 'High wind advisory' },
  ];

  for (let i = 0; i < count; i++) {
    const region = randomFromArray(WEATHER_REGIONS);
    const eventType = randomFromArray(eventTypes);
    const hoursAgo = randomBetween(0, 12);

    events.push({
      id: generateId(),
      domain: 'weather',
      event_type: eventType.type,
      severity: eventType.severity,
      timestamp: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
      label: eventType.label,
      details: {
        region_id: region.id,
        region_name: region.name,
        visibility_km: region.visibility_km,
        wind_kts: region.wind_kts,
        precip_type: region.precip_type,
        temp_c: region.temp_c,
        alert_level: region.alert_level,
        affected_modes: ['aviation', 'road', 'marine'],
      },
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ============ Scenario Definitions ============

export interface TransportScenario {
  id: string;
  name: string;
  short_label: string;
  description: string;
  query: string;
  domains: TransportDomain[];
  severity: 'moderate' | 'severe' | 'critical';
}

export const TRANSPORT_SCENARIOS: TransportScenario[] = [
  {
    id: 'coastal_storm_disruption',
    name: 'Coastal Storm Disruption',
    short_label: 'Storm over West Coast',
    description: 'Simulate a coastal storm impacting YVR, YXX, and Port of Vancouver.',
    query: 'Simulate a coastal storm impacting YVR, YXX, and Port of Vancouver. Show cascading effects on aviation delays, marine vessel holds, and highway closures.',
    domains: ['aviation', 'marine', 'road', 'weather'],
    severity: 'severe',
  },
  {
    id: 'cross_border_truck_surge',
    name: 'Cross-Border Truck Surge',
    short_label: 'Truck surge at border',
    description: 'Spike in truck traffic at Windsor–Detroit and Pacific Highway crossings.',
    query: 'Simulate a 40% spike in truck traffic at Windsor-Detroit and Pacific Highway border crossings. Show wait time impacts and recommended rerouting options.',
    domains: ['border', 'road', 'rail'],
    severity: 'moderate',
  },
  {
    id: 'rail_safety_alerts',
    name: 'Rail Safety Alert Cascade',
    short_label: 'Rail safety anomalies',
    description: 'Series of brake overheat and speed anomalies on western freight corridors.',
    query: 'Simulate a series of brake overheat alerts and speed anomalies on CN/CP western freight corridors. Show derailment risk scores and recommended slow orders.',
    domains: ['rail', 'road'],
    severity: 'critical',
  },
  {
    id: 'national_travel_peak',
    name: 'National Holiday Travel Peak',
    short_label: 'Holiday travel peak',
    description: 'Holiday travel surge across airports, highways, and rail.',
    query: 'Simulate Canada Day long weekend travel surge. Show capacity stress across all major airports, VIA Rail corridors, and Trans-Canada Highway segments.',
    domains: ['aviation', 'rail', 'road', 'border'],
    severity: 'moderate',
  },
  {
    id: 'marine_congestion_relief',
    name: 'Marine Port Congestion Relief',
    short_label: 'Port congestion relief',
    description: 'Test impact of rerouting vessels between Vancouver, Prince Rupert, and Halifax.',
    query: 'Simulate rerouting 30% of container vessels from Port of Vancouver to Prince Rupert and Halifax. Show impact on congestion, rail intermodal demand, and supply chain timing.',
    domains: ['marine', 'rail'],
    severity: 'moderate',
  },
  {
    id: 'prairie_snowstorm',
    name: 'Prairie Snowstorm Disruption',
    short_label: 'Snowstorm over Prairies',
    description: 'Heavy snow over YYC/YEG region with cascading delays.',
    query: 'Simulate a severe snowstorm over Alberta and Saskatchewan. Show aviation ground stops at YYC/YEG, highway closures on Highway 2, and rail slow orders.',
    domains: ['aviation', 'road', 'rail', 'weather'],
    severity: 'critical',
  },
  {
    id: 'co2_modal_shift',
    name: 'CO₂ Reduction Modal Shift',
    short_label: 'Modal shift analysis',
    description: 'Model CO₂ reduction if 20% of freight shifts from road to rail.',
    query: 'Simulate shifting 20% of long-haul freight from highway trucking to rail. Calculate national CO₂ reduction, impact on border crossings, and intermodal terminal demand.',
    domains: ['rail', 'road', 'border'],
    severity: 'moderate',
  },
  {
    id: 'aviation_cyberattack',
    name: 'Aviation System Cyberattack',
    short_label: 'Cyber incident response',
    description: 'Simulate response to ADS-B data anomalies suggesting cyber interference.',
    query: 'Simulate ADS-B data anomalies across multiple airports suggesting potential cyber interference. Show incident detection, NOTAMs issued, and backup procedures activated.',
    domains: ['aviation', 'regulatory'],
    severity: 'critical',
  },
  {
    id: 'great_lakes_fog',
    name: 'Great Lakes Dense Fog Event',
    short_label: 'Great Lakes fog event',
    description: 'Dense fog impacting marine traffic on Great Lakes and St. Lawrence Seaway.',
    query: 'Simulate a dense fog event across the Great Lakes and St. Lawrence Seaway. Show vessel holds, ETA delays, and impact on Thunder Bay and Montreal port operations.',
    domains: ['marine', 'weather'],
    severity: 'severe',
  },
  {
    id: 'compliance_audit_surge',
    name: 'Regulatory Compliance Audit',
    short_label: 'Compliance audit',
    description: 'Run compliance scoring across all modes for regulatory reporting.',
    query: 'Run a comprehensive compliance audit across aviation, rail, and marine operators. Generate compliance scores, identify violations, and recommend corrective actions.',
    domains: ['aviation', 'rail', 'marine', 'regulatory'],
    severity: 'moderate',
  },
];

// ============ Simulation Runner ============

export function runTransportCanadaSimulation(scenarioId: string): {
  events: TransportEvent[];
  kpis: Record<string, number>;
  summary: string;
} {
  const scenario = TRANSPORT_SCENARIOS.find(s => s.id === scenarioId) || TRANSPORT_SCENARIOS[0];
  const events: TransportEvent[] = [];

  // Generate events based on scenario domains
  if (scenario.domains.includes('aviation')) {
    events.push(...generateAviationEvents(scenario.severity === 'critical' ? 6 : 4));
  }
  if (scenario.domains.includes('rail')) {
    events.push(...generateRailEvents(scenario.severity === 'critical' ? 5 : 3));
  }
  if (scenario.domains.includes('marine')) {
    events.push(...generateMarineEvents(scenario.severity === 'critical' ? 4 : 2));
  }
  if (scenario.domains.includes('road')) {
    events.push(...generateRoadEvents(scenario.severity === 'critical' ? 4 : 2));
  }
  if (scenario.domains.includes('border')) {
    events.push(...generateBorderEvents(3));
  }
  if (scenario.domains.includes('weather')) {
    events.push(...generateWeatherEvents(3));
  }

  // Calculate KPIs based on events
  const aviationEvents = events.filter(e => e.domain === 'aviation');
  const railEvents = events.filter(e => e.domain === 'rail');
  const criticalCount = events.filter(e => e.severity === 'critical').length;

  const kpis = {
    on_time_performance: Math.max(65, 95 - aviationEvents.length * 5 - criticalCount * 8),
    avg_border_wait_min: 25 + events.filter(e => e.domain === 'border').length * 8,
    port_congestion_index: Math.min(95, 40 + events.filter(e => e.domain === 'marine').length * 12),
    rail_safety_risk_index: Math.min(0.9, 0.2 + railEvents.filter(e => e.severity === 'high' || e.severity === 'critical').length * 0.15),
    incident_rate_per_1000: parseFloat((2.5 + criticalCount * 0.8).toFixed(2)),
    weather_delay_minutes: events.filter(e => e.domain === 'weather').length * 35,
  };

  const summary = `Scenario "${scenario.name}" generated ${events.length} events across ${scenario.domains.length} transport domains. ` +
    `${criticalCount} critical incidents detected. On-time performance: ${kpis.on_time_performance}%. ` +
    `Rail safety index: ${(kpis.rail_safety_risk_index * 100).toFixed(0)}%. ` +
    `Recommended: ${criticalCount > 2 ? 'Activate national operations center coordination.' : 'Continue monitoring with elevated alertness.'}`;

  return { events, kpis, summary };
}

// ============ Mock Simulations for History ============

interface MockSimulation {
  id: string;
  agent_id: string;
  user_id: string;
  run_type: string;
  input_query: string;
  output_summary: string;
  status: string;
  duration_ms: number;
  industry: string;
  scenario_label: string;
  created_at: string;
  completed_at: string;
  error: string | null;
}

const transportCanadaSimulations: Omit<MockSimulation, 'id' | 'agent_id' | 'user_id' | 'created_at' | 'completed_at'>[] = [
  {
    run_type: 'simulation',
    scenario_label: 'Coastal Storm Impact Analysis',
    input_query: 'Simulate a coastal storm impacting YVR, YXX, and Port of Vancouver. Show cascading effects on aviation delays, marine vessel holds, and highway closures.',
    output_summary: 'Storm scenario: 23 flights delayed at YVR (avg 45 min), 8 vessels on weather hold at Port of Vancouver, Trans-Canada Highway Sea-to-Sky closed. Cascading impact score: 0.78. Recommended: Activate regional coordination center, issue travel advisories for affected corridors.',
    status: 'completed',
    duration_ms: 6800,
    industry: 'government_transport',
    error: null,
  },
  {
    run_type: 'simulation',
    scenario_label: 'Rail Safety Alert Cascade',
    input_query: 'Simulate brake overheat alerts on western freight corridors. Show derailment risk and recommended slow orders.',
    output_summary: 'Detected 5 trains with elevated brake temps (>400°C): CN8745, CP3421, CP7890 flagged critical. Derailment risk score: 0.86 for Rocky Mountain corridor. Issued slow orders for 3 segments. Estimated delay impact: 18 hours aggregate. Recommended maintenance dispatch to Field, BC.',
    status: 'completed',
    duration_ms: 5200,
    industry: 'government_transport',
    error: null,
  },
  {
    run_type: 'simulation',
    scenario_label: 'Border Truck Surge Analysis',
    input_query: 'Simulate 40% spike in truck traffic at Windsor-Detroit crossing.',
    output_summary: 'Truck wait time increased from 45 to 72 minutes. Passenger crossing spillover detected. Recommended: Open 4 additional FAST lanes, coordinate with CBSA for extended hours. Alternative routing via Sarnia reduces wait by 35%. Trade flow impact: $2.4M/hour delayed.',
    status: 'completed',
    duration_ms: 4100,
    industry: 'government_transport',
    error: null,
  },
  {
    run_type: 'simulation',
    scenario_label: 'Marine Port Congestion Model',
    input_query: 'Simulate rerouting vessels from Vancouver to Prince Rupert.',
    output_summary: 'Rerouting 30% container traffic to Prince Rupert reduces Vancouver congestion index from 85% to 62%. Rail intermodal demand at Prince Rupert increases 45%. Transit time to Toronto increases by 8 hours. Net supply chain cost impact: -$1.2M/week. Recommended: Implement partial rerouting during peak season.',
    status: 'completed',
    duration_ms: 7500,
    industry: 'government_transport',
    error: null,
  },
  {
    run_type: 'simulation',
    scenario_label: 'National CO₂ Modal Shift',
    input_query: 'Calculate CO₂ reduction from shifting 20% freight to rail.',
    output_summary: 'Modal shift analysis: 20% long-haul freight from truck to rail reduces annual CO₂ by 2.8 megatonnes. Border crossing demand at Windsor-Detroit drops 12%. Intermodal terminal capacity at Toronto and Calgary needs 25% expansion. Payback period for infrastructure investment: 4.2 years.',
    status: 'completed',
    duration_ms: 8900,
    industry: 'government_transport',
    error: null,
  },
];

function generateTimestamps(hoursAgo: number, durationMs: number) {
  const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const completedAt = new Date(createdAt.getTime() + durationMs);
  return {
    created_at: createdAt.toISOString(),
    completed_at: completedAt.toISOString(),
  };
}

export function getTransportCanadaSimulations(agentId: string): MockSimulation[] {
  return transportCanadaSimulations.map((sim, idx) => ({
    ...sim,
    id: `mock-sim-tc-${idx}`,
    agent_id: agentId,
    user_id: 'mock-user',
    ...generateTimestamps((idx + 1) * 3, sim.duration_ms),
  }));
}

export function getTransportCanadaSuggestions(): string[] {
  return TRANSPORT_SCENARIOS.slice(0, 5).map(s => s.short_label);
}

export function getTransportCanadaFullSuggestions(): string[] {
  return TRANSPORT_SCENARIOS.map(s => s.query);
}
