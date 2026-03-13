# Vercel Dashboard Patterns: Information Density & Navigation

## Overview
Vercel's dashboard is a masterclass in managing complexity while maintaining clarity. It balances power-user efficiency with onboarding simplicity through:

- **Progressive Information Disclosure**
- **Context-Aware UI**
- **Intelligent Defaults**
- **Smart Search & Filtering**
- **Real-Time Status Indicators**

## Dashboard Architecture

### Mental Model
```
User → Projects → Deployments → Build Details → Logs
       ↓
    Team Members
    ↓
    Settings (Team, Billing, Integrations)
```

Each level is independently valuable yet connects to higher context.

## Information Hierarchy

### Level 1: Projects Dashboard
```typescript
interface ProjectCard {
  // Identity
  projectName: string;
  teamName: string;
  
  // Status (glanceable)
  deploymentStatus: 'Active' | 'Building' | 'Failed' | 'Paused';
  statusIcon: ReactNode;           // Color-coded
  latestDeploymentTime: string;
  
  // Quick Actions
  visitButton: string;             // Live URL
  gitRepository: string;           // Link to repo
  
  // Health Metrics (subtle)
  averageDeploymentTime: string;
  failureRate: string;             // Only if relevant
  
  // Metadata Expandable
  framework: string;               // Tag
  region: string;                  // Tag
}

// Sorting strategies
const SORT_OPTIONS = [
  'last-deployed',     // Default
  'name',
  'created',
  'status',           // Failed first
];

// Filtering
const FILTER_OPTIONS = [
  'status:active',
  'status:failed',
  'team:engineering',
  'framework:nextjs',
  'hasIssues:true',
];
```

#### Visual Treatment
```
┌─────────────────────────────────────┐
│ [🟢] Project Name                   │
│ team-name → github.com/user/repo    │
│                                     │
│ Last deployed 2 minutes ago         │
│ [Visit Live] [Open Settings]        │
└─────────────────────────────────────┘

Hover state:
- Subtle background highlight
- Quick action buttons emerge
- Expand arrow appears
```

### Level 2: Deployment List View
```typescript
interface DeploymentRow {
  // Left (Identity)
  deploymentNumber: string;        // e.g., #1234
  createdAt: string;               // Relative time, absolute on hover
  
  // Center (Status)
  status: Status;                  // Visual indicator + text
  statusIndicator: {
    icon: ReactNode;
    color: string;                 // Green, yellow, red, gray
    label: string;
  };
  
  // Build time
  buildTime: string;               // e.g., "1m 23s"
  
  // Trigger
  trigger: {
    type: 'git-push' | 'manual' | 'rollback' | 'redeploy';
    source: string;                // branch or manual
    author: {
      avatar: string;
      name: string;
    };
  };
  
  // Right (Actions)
  actions: {
    viewLogs: () => void;
    inspect: () => void;
    promote: () => void;
    rollback: () => void;
  };
}

// Status visualization
const STATUS_STYLES = {
  'Ready': { color: 'green', icon: '✓' },
  'Building': { color: 'blue', icon: '⟳' },
  'Error': { color: 'red', icon: '✗' },
  'Queued': { color: 'gray', icon: '◌' },
  'Canceled': { color: 'gray', icon: '⊘' },
};
```

#### Column Strategy
```
✓ Status | # | Time | Built | By | Branch | Actions
────────────────────────────────────────────────────
  ✓      #1234  2m ago 1m23s alice main    ⋮
  ✗      #1233  4m ago  1m42s bob   fix/ui ⋮
  ⟳      #1232  6m ago  ⟳ (2m) charlie dev ⋮
```

No unnecessary information. Each column has purpose.

## Search & Filtering System

### Global Search (Cmd+K)
```typescript
interface GlobalSearch {
  // Query parsing
  searchQuery: string;
  
  // Faceted search
  facets: {
    'project': string[];        // project:auth-service
    'status': string[];         // status:failed
    'deployment': string[];     // #1234
    'branch': string[];         // branch:main
    'team': string[];           // team:frontend
  };
  
  // Results ranking
  results: {
    projects: Project[];        // Exact name matches first
    deployments: Deployment[]; // Recent first
    team_members: User[];      // Current team only
  };
}

// Search is performant: client-side for instant feedback
// Server-side for historical searches

const SearchModal = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  
  useEffect(() => {
    // Debounce: 100ms
    const timer = setTimeout(() => {
      // Client-side filter first
      const instant = filterLocal(query);
      setResults(instant);
      
      // Then fetch server results if not found
      if (instant.length < 5) {
        fetchServerResults(query).then(serverResults => {
          setResults([...instant, ...serverResults]);
        });
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [query]);
};
```

### Filter UI Pattern
```jsx
<FilterBar>
  {/* Status filter */}
  <FilterChip 
    label="Status"
    options={['All', 'Ready', 'Error', 'Building']}
    onSelect={(status) => updateFilter('status', status)}
  />
  
  {/* Time range */}
  <FilterChip 
    label="Last 24h"
    options={['All time', 'Last 24h', 'Last 7d', 'Last 30d']}
  />
  
  {/* Branch */}
  <FilterChip 
    label="Branch"
    searchable
    options={getUniqueBranches()}
  />
  
  {/* Saved filters */}
  <SavedFilters
    recent={[
      'status:error',
      'branch:main',
    ]}
  />
</FilterBar>
```

## Real-Time Status System

### WebSocket Integration
```typescript
// Subscribe to project Updates
const ProjectDeploymentList = ({ projectId }) => {
  const [deployments, setDeployments] = useState([]);
  
  useEffect(() => {
    // Initial fetch
    fetchDeployments(projectId).then(setDeployments);
    
    // Real-time updates
    const unsubscribe = websocket.subscribe(
      `deployments:${projectId}`,
      (event) => {
        switch (event.type) {
          case 'deployment:created':
            setDeployments(prev => [event.deployment, ...prev]);
            break;
            
          case 'deployment:updated':
            setDeployments(prev => prev.map(d =>
              d.id === event.deployment.id ? event.deployment : d
            ));
            break;
            
          case 'build:progress':
            // Optimistic update for build time
            updateBuildProgress(event.deploymentId, event.progress);
            break;
            
          case 'deployment:completed':
            // Refresh logs if viewing
            if (activeDeployment?.id === event.deploymentId) {
              fetchLogs(event.deploymentId);
            }
            break;
        }
      }
    );
    
    return unsubscribe;
  }, [projectId]);
};
```

### Progressive Status Indicators
```
Creating deployment:
  [◌ Initializing...] 

Building:
  [⟳ Building... 45% complete] (with progress bar)
  
Optimizing:
  [⟳ Optimizing... ] (no percentage, ETA calculation)
  
Ready:
  [✓ Ready · 2m 34s] → becomes clickable to view details
  
Error (immediately visible):
  [✗ Error · Build failed]
  /→ Click to see logs
```

## Detail Panels & Drawers

### Deployment Detail Drawer
```jsx
const DeploymentDrawer = ({ deployment, onClose }) => {
  return (
    <Drawer position="right">
      {/* Header with key info */}
      <DrawerHeader>
        <Status status={deployment.status} />
        <Heading>Deployment #{deployment.number}</Heading>
        <Subheading>{timeAgo(deployment.createdAt)}</Subheading>
      </DrawerHeader>
      
      {/* Tabbed interface */}
      <Tabs defaultValue="overview">
        <Tab value="overview" label="Overview">
          <OverviewPanel deployment={deployment} />
        </Tab>
        
        <Tab value="logs" label="Logs">
          <LogsPanel deploymentId={deployment.id} />
        </Tab>
        
        <Tab value="analytics" label="Analytics">
          <AnalyticsPanel deployment={deployment} />
        </Tab>
      </Tabs>
      
      {/* Actions footer */}
      <DrawerFooter>
        <Button onClick={promote}>Promote to Production</Button>
        <Button variant="secondary" onClick={rollback}>Rollback</Button>
      </DrawerFooter>
    </Drawer>
  );
};
```

### Overview Panel Content
```
Deployment Details
─────────────────
Status      Ready · 2m 34s
Branch      main
Commit      a3b2c1d
Message     "Fix: auth bug"
Built by    alice@example.com
URL         https://project.vercel.app
Environment Production

Build Details
─────────────
Total time    2m 34s
Download      3.2s
Build         1m 43s
Analyze       15s
Deploy        23s
Optimize      11s

Performance
───────────
First Contentful Paint   1.2s
Largest Contentful Paint 2.1s  ⚠️ (threshold: 2.0s)
Cumulative Layout Shift  0.01

Image Optimization
──────────────────
Images processed: 12
Size reduced: 34%
Cache: Hit (9/12)
```

## Analytics Dashboard

### Key Metrics at a Glance
```
┌─────────────────────────────────────┐
│ Deployments                         │
│ This month: 124 (↑ 18% from last)  │
├─────────────────────────────────────┤
│ Success Rate                        │
│ 98.4% (3× failures yesterday)       │
├─────────────────────────────────────┤
│ Avg Deploy Time                     │
│ 2m 31s (↓ 5% from last week)        │
├─────────────────────────────────────┤
│ Most Common Error                   │
│ Timeout (8 occurrences)             │
└─────────────────────────────────────┘
```

### Time Series Chart
```typescript
interface AnalyticsMetric {
  name: string;
  data: Array<{
    timestamp: Date;
    value: number;
    breakdown?: Record<string, number>;  // e.g., { success: 110, failed: 2 }
  }>;
  sparkline: boolean;  // Show simple line chart
  comparison: {
    period: string;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
}

// Clickable chart regions for drill-down
const DeploymentsChart = ({ data }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  
  return (
    <Chart
      data={data}
      onBarClick={(date) => {
        setSelectedDate(date);
        // Show deployments from that day
      }}
    />
  );
};
```

## Navigation Structure

### Sidebar Navigation
```
Projects (with search)
├─ project-1          [⋯]
├─ project-2          [⋯]
└─ + New Project

Deployments (contextual to selected project)
├─ Production
├─ Preview
└─ All

Team & Settings
├─ Team Members
├─ Billing
├─ Integrations
└─ Settings
```

### Top Navigation (Sticky)
```
┌──────────────────────────────────────┐
│ [Logo] Projects / [ProjectName] ↓    │
│                                      │
│        [Search] [⊕] [🔔] [👤] [⋮]   │
└──────────────────────────────────────┘
```

## Mobile Dashboard

### Touch-Optimized Layout
```
Portrait (< 768px):
┌─────────────────────────┐
│ Projects / [☰]          │
├─────────────────────────┤
│ Project 1          [▶]  │
│ ✓ Ready · 2m ago        │
├─────────────────────────┤
│ Project 2          [▶]  │
│ ✗ Error · 1h ago        │
├─────────────────────────┤
│ + New Project           │
└─────────────────────────┘

Tabs at bottom:
[Projects] [Deployments] [Settings]
```

## Performance Optimizations

### Data Fetching Strategy
```typescript
// ISR (Incremental Static Regeneration)
const Projects = async () => {
  const projects = await getProjects({
    revalidate: 60, // Regenerate every 60s
  });
  
  // Server-side rendering for critical data
  // Client-side updates for real-time changes
  return <ProjectList projects={projects} />;
};

// Virtualization for long lists
const DeploymentList = ({ deployments }) => {
  const virtualizer = useVirtual({
    size: deployments.length,
    estimateSize: React.useCallback(() => 60, []),
  });
  
  return (
    <div style={{ height: '100%' }}>
      {virtualizer.virtualItems.map(virtualItem => (
        <DeploymentRow
          key={deployments[virtualItem.index].id}
          deployment={deployments[virtualItem.index]}
          style={{
            transform: `translateY(${virtualItem.start}px)`,
          }}
        />
      ))}
    </div>
  );
};
```

### Caching Strategy
```typescript
// Cache layers
const getDeployments = async (projectId) => {
  // L1: In-memory cache (5 minutes)
  if (memoryCache.has(projectId)) {
    return memoryCache.get(projectId);
  }
  
  // L2: Browser IndexedDB (1 hour)
  const cached = await db.deployments.where({ projectId }).toArray();
  if (cached.length > 0) {
    return cached;
  }
  
  // L3: Server fetch
  const fresh = await api.get(`/deployments/${projectId}`);
  await db.deployments.bulkAdd(fresh);
  memoryCache.set(projectId, fresh, 5 * 60 * 1000);
  
  return fresh;
};
```

## Lessons for Your SaaS

1. **Status visibility is critical**: Color + icon + text + time
2. **Search > Navigation**: Power users want instant access
3. **Real-time updates**: WebSocket for live status, not polling
4. **Progressive disclosure**: Show essentials, hide advanced
5. **Mobile is different**: Not a shrunken desktop
6. **Keyboard shortcuts**: Power users navigate faster
7. **Analytics are secondary**: Primary task is deployment, not metrics
8. **Consistent loading states**: Skeleton screens, progress indicators

## Implementation Priorities

1. Solid project index with proper search
2. Deployment list with real-time status
3. Deployment detail view with logs
4. Analytics dashboard (simple metrics first)
5. Mobile-optimized layout
6. Advanced filtering & saved views
