# AOC Digital Twin Features

## Overview

The AOC provides specialized views and monitoring for Digital Twin agents, including spatial visualization and real-time sensor health monitoring.

## Components

### 1. DigitalTwinSpatialView

Interactive spatial visualization of digital twin sensors and zones.

**Features:**
- 2D map view with clickable zones and sensors
- Real-time sensor status visualization
- Zone-based filtering
- Sensor detail panel
- Color-coded health indicators
- List view for tabular data

**Usage:**
```tsx
import { DigitalTwinSpatialView } from '@/components/aoc/panels/DigitalTwinSpatialView';

<DigitalTwinSpatialView
  twinId={agentId}
  viewMode="2d" // or "list"
/>
```

**Sensor Types:**
- `temperature` - Temperature sensors
- `motion` - Motion/activity sensors
- `power` - Power consumption monitors
- `pressure` - Pressure sensors
- `humidity` - Humidity monitors

**Sensor Status:**
- `healthy` - Operating within normal parameters (green)
- `warning` - Approaching threshold limits (yellow)
- `critical` - Exceeded safe thresholds (red)
- `offline` - Not responding (gray)

### 2. SensorHealthDashboard

Comprehensive health monitoring dashboard for all sensors.

**Features:**
- Overall system health percentage
- Uptime tracking (30-day rolling)
- Average response time monitoring
- Daily alert count
- Sensor status breakdown with progress bars
- Recent alerts feed with severity indicators

**Usage:**
```tsx
import { SensorHealthDashboard } from '@/components/aoc/panels/SensorHealthDashboard';

<SensorHealthDashboard
  twinId={agentId}
/>
```

**Metrics Tracked:**
- `total` - Total number of sensors
- `healthy` - Sensors operating normally
- `warning` - Sensors with warnings
- `critical` - Sensors in critical state
- `offline` - Offline sensors
- `uptime` - System uptime percentage
- `avgResponseTime` - Average sensor response time (ms)
- `alertsToday` - Number of alerts in last 24 hours

## Database Schema for Digital Twins

### Sensors Table (if extending current schema)

```sql
CREATE TABLE public.digital_twin_sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id UUID NOT NULL REFERENCES digital_twins(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('temperature', 'motion', 'power', 'pressure', 'humidity')),
  location JSONB NOT NULL, -- { x, y, zone }
  status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'warning', 'critical', 'offline')),
  value NUMERIC,
  unit TEXT,
  threshold JSONB, -- { min, max }
  last_update TIMESTAMPTZ DEFAULT now(),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_digital_twin_sensors_twin_id ON digital_twin_sensors(twin_id);
CREATE INDEX idx_digital_twin_sensors_status ON digital_twin_sensors(status);

-- Enable RLS
ALTER TABLE digital_twin_sensors ENABLE ROW LEVEL SECURITY;

-- Users can view sensors for twins they own
CREATE POLICY digital_twin_sensors_select ON digital_twin_sensors
  FOR SELECT 
  USING (
    twin_id IN (
      SELECT id FROM digital_twins WHERE user_id = auth.uid()
    )
  );
```

### Zones Table

```sql
CREATE TABLE public.digital_twin_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id UUID NOT NULL REFERENCES digital_twins(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bounds JSONB NOT NULL, -- { x, y, width, height }
  color TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_digital_twin_zones_twin_id ON digital_twin_zones(twin_id);

ALTER TABLE digital_twin_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY digital_twin_zones_select ON digital_twin_zones
  FOR SELECT 
  USING (
    twin_id IN (
      SELECT id FROM digital_twins WHERE user_id = auth.uid()
    )
  );
```

### Sensor Alerts Table

```sql
CREATE TABLE public.digital_twin_sensor_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id UUID NOT NULL REFERENCES digital_twin_sensors(id) ON DELETE CASCADE,
  twin_id UUID NOT NULL REFERENCES digital_twins(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  message TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sensor_alerts_sensor_id ON digital_twin_sensor_alerts(sensor_id);
CREATE INDEX idx_sensor_alerts_twin_id ON digital_twin_sensor_alerts(twin_id);
CREATE INDEX idx_sensor_alerts_severity ON digital_twin_sensor_alerts(severity);
CREATE INDEX idx_sensor_alerts_acknowledged ON digital_twin_sensor_alerts(acknowledged);

ALTER TABLE digital_twin_sensor_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY sensor_alerts_select ON digital_twin_sensor_alerts
  FOR SELECT 
  USING (
    twin_id IN (
      SELECT id FROM digital_twins WHERE user_id = auth.uid()
    )
  );
```

## Integration with AOC

### Detecting Digital Twin Agents

Check if an agent is a digital twin by examining its `config`:

```typescript
const isDigitalTwin = (agent: Agent): boolean => {
  return agent.config?.type === 'digital_twin' || 
         agent.template_id?.includes('twin');
};
```

### Conditional Rendering in AOC

```tsx
function AOCMainView({ agent }: { agent: Agent }) {
  const isDigitalTwin = agent.config?.type === 'digital_twin';

  return (
    <Tabs>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="logs">Logs</TabsTrigger>
        
        {/* Digital Twin specific tabs */}
        {isDigitalTwin && (
          <>
            <TabsTrigger value="spatial">Spatial View</TabsTrigger>
            <TabsTrigger value="sensors">Sensor Health</TabsTrigger>
          </>
        )}
      </TabsList>

      {/* Standard tabs */}
      <TabsContent value="overview">
        <SystemOverview agent={agent} />
      </TabsContent>

      {/* Digital Twin tabs */}
      {isDigitalTwin && (
        <>
          <TabsContent value="spatial">
            <DigitalTwinSpatialView twinId={agent.id} />
          </TabsContent>
          <TabsContent value="sensors">
            <SensorHealthDashboard twinId={agent.id} />
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}
```

## Real-time Updates

Use Supabase Realtime to subscribe to sensor updates:

```typescript
useEffect(() => {
  const channel = supabase
    .channel('sensor-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'digital_twin_sensors',
        filter: `twin_id=eq.${twinId}`
      },
      (payload) => {
        console.log('Sensor update:', payload);
        // Update local state
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [twinId]);
```

## Mock Data for Development

Both components include mock data generators for development without backend:

```typescript
// DigitalTwinSpatialView
// - 4 sample sensors with different statuses
// - 4 sample zones (Terminal Gates, Baggage, Infrastructure, Runway)
// - Realistic coordinates and thresholds

// SensorHealthDashboard
// - Sample metrics (24 total sensors, 18 healthy)
// - 98.5% uptime
// - 3 recent alerts with timestamps
```

## Testing

### Manual Testing Checklist

- [ ] 2D map renders with zones and sensors
- [ ] Click on zone filters sensor list
- [ ] Click on sensor shows details panel
- [ ] Sensor colors match status (green/yellow/red/gray)
- [ ] List view shows all sensor data
- [ ] Health dashboard shows correct metrics
- [ ] Progress bars display properly
- [ ] Recent alerts render with correct severity
- [ ] Trends indicators show up/down/stable
- [ ] All responsive on mobile

### E2E Test Coverage

Add to `tests/aoc/aoc-complete-flow.spec.ts`:

```typescript
test('Digital Twin spatial view loads', async ({ page }) => {
  await page.goto('/agents/DIGITAL_TWIN_ID/aoc');
  await page.click('button:has-text("Spatial View")');
  
  // Check map renders
  await expect(page.locator('svg')).toBeVisible();
  
  // Check zones render
  await expect(page.locator('rect')).toHaveCount(4);
  
  // Click sensor
  await page.locator('circle').first().click();
  await expect(page.locator('text=Sensor Details')).toBeVisible();
});

test('Sensor health dashboard displays metrics', async ({ page }) => {
  await page.goto('/agents/DIGITAL_TWIN_ID/aoc');
  await page.click('button:has-text("Sensor Health")');
  
  // Check metrics cards
  await expect(page.locator('text=System Health')).toBeVisible();
  await expect(page.locator('text=Uptime')).toBeVisible();
  await expect(page.locator('text=Avg Response')).toBeVisible();
  
  // Check alerts section
  await expect(page.locator('text=Recent Alerts')).toBeVisible();
});
```

## Performance Considerations

1. **Lazy Loading**: Load sensor data only when spatial/health tabs are opened
2. **Pagination**: For systems with 100+ sensors, paginate list view
3. **Throttling**: Throttle real-time updates to max 1 update/second
4. **Caching**: Cache zone definitions (they rarely change)
5. **Virtual Scrolling**: Use virtual scrolling for large sensor lists

## Future Enhancements

- [ ] 3D view implementation using Three.js
- [ ] Historical sensor data charts
- [ ] Predictive anomaly detection
- [ ] Bulk sensor operations (acknowledge all alerts)
- [ ] Export sensor data to CSV
- [ ] Custom alert rules configuration
- [ ] Sensor calibration workflow
- [ ] Zone heatmaps
- [ ] Animated sensor value changes
- [ ] AR/VR integration for spatial view
