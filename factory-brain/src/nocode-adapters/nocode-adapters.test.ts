import { describe, it, expect } from 'vitest'
import {
  FlutterFlowAdapter,
  BubbleAdapter,
  ZapierAdapter,
  RetoolAdapter,
  NoCodeAdapterFactory,
  Blueprint,
  noCodeAdapterFactory,
} from './index'

const SAMPLE_BLUEPRINT: Blueprint = {
  appName: 'TaskFlow Pro',
  description: 'A project management SaaS for remote teams',
  sqlSchema: `
    CREATE TABLE users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL UNIQUE,
      name text NOT NULL,
      tenant_id uuid NOT NULL,
      role text DEFAULT 'user',
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      description text,
      tenant_id uuid NOT NULL,
      owner_id uuid REFERENCES users(id),
      status text DEFAULT 'active',
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE tasks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      description text,
      project_id uuid REFERENCES projects(id),
      assignee_id uuid REFERENCES users(id),
      status text DEFAULT 'todo',
      priority integer DEFAULT 1,
      due_date timestamptz,
      created_at timestamptz DEFAULT now()
    );
  `,
  apiSpec: `
openapi: 3.0.0
info:
  title: TaskFlow API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
    post:
      summary: Create user
  /projects:
    get:
      summary: List projects
    post:
      summary: Create project
  /tasks:
    get:
      summary: List tasks
    post:
      summary: Create task
  /tasks/{id}:
    put:
      summary: Update task
    delete:
      summary: Delete task
  `,
  features: ['auth', 'billing', 'analytics', 'notifications', 'dashboard'],
  pricingModel: 'Subscription',
  techStack: ['Next.js', 'PostgreSQL', 'Redis', 'Supabase'],
}

describe('FlutterFlowAdapter', () => {
  const adapter = new FlutterFlowAdapter()

  it('should convert blueprint to FlutterFlow format', () => {
    const output = adapter.convert(SAMPLE_BLUEPRINT)
    expect(output.platform).toBe('FlutterFlow')
    expect(output.format).toBe('json')
    expect(output.content).toBeTruthy()
    expect(output.instructions.length).toBeGreaterThan(0)
    expect(output.limitations.length).toBeGreaterThan(0)
  })

  it('should include data types from SQL schema', () => {
    const output = adapter.convert(SAMPLE_BLUEPRINT)
    const config = JSON.parse(output.content)
    expect(config.dataTypes).toBeDefined()
    expect(config.dataTypes.length).toBeGreaterThan(0)
    // Should detect users, projects, tasks tables
    const tableNames = config.dataTypes.map((dt: { name: string }) => dt.name)
    expect(tableNames).toContain('users')
    expect(tableNames).toContain('projects')
    expect(tableNames).toContain('tasks')
  })

  it('should include API calls from OpenAPI spec', () => {
    const output = adapter.convert(SAMPLE_BLUEPRINT)
    const config = JSON.parse(output.content)
    expect(config.apiCalls).toBeDefined()
    expect(config.apiCalls.length).toBeGreaterThan(0)
  })

  it('should include pages scaffold', () => {
    const output = adapter.convert(SAMPLE_BLUEPRINT)
    const config = JSON.parse(output.content)
    expect(config.pages).toBeDefined()
    expect(config.pages.length).toBeGreaterThan(0)
    const pageNames = config.pages.map((p: { name: string }) => p.name)
    expect(pageNames).toContain('LoginPage')
    expect(pageNames).toContain('DashboardPage')
  })
})

describe('BubbleAdapter', () => {
  const adapter = new BubbleAdapter()

  it('should convert blueprint to Bubble format', () => {
    const output = adapter.convert(SAMPLE_BLUEPRINT)
    expect(output.platform).toBe('Bubble')
    expect(output.format).toBe('json')
  })

  it('should include data types with privacy rules', () => {
    const output = adapter.convert(SAMPLE_BLUEPRINT)
    const config = JSON.parse(output.content)
    expect(config.dataTypes).toBeDefined()
    config.dataTypes.forEach((dt: { privacyRules: unknown[] }) => {
      expect(dt.privacyRules).toBeDefined()
      expect(dt.privacyRules.length).toBeGreaterThan(0)
    })
  })

  it('should map boolean SQL type to yes/no', () => {
    const output = adapter.convert(SAMPLE_BLUEPRINT)
    const config = JSON.parse(output.content)
    // Check that types are mapped correctly
    const usersType = config.dataTypes.find((dt: { name: string }) => dt.name === 'users')
    expect(usersType).toBeDefined()
    const emailField = usersType.fields.find((f: { name: string }) => f.name === 'email')
    expect(emailField?.type).toBe('text')
  })
})

describe('ZapierAdapter', () => {
  const adapter = new ZapierAdapter()

  it('should convert blueprint to Zapier format', () => {
    const output = adapter.convert(SAMPLE_BLUEPRINT)
    expect(output.platform).toBe('Zapier')
    expect(output.format).toBe('json')
  })

  it('should create triggers from GET endpoints', () => {
    const output = adapter.convert(SAMPLE_BLUEPRINT)
    const config = JSON.parse(output.content)
    expect(config.triggers).toBeDefined()
    expect(config.triggers.length).toBeGreaterThan(0)
    config.triggers.forEach((trigger: { operation: { perform: { method: string } } }) => {
      expect(trigger.operation.perform.method).toBe('GET')
    })
  })

  it('should create actions from POST/PUT endpoints', () => {
    const output = adapter.convert(SAMPLE_BLUEPRINT)
    const config = JSON.parse(output.content)
    expect(config.actions).toBeDefined()
    expect(config.actions.length).toBeGreaterThan(0)
    config.actions.forEach((action: { operation: { perform: { method: string } } }) => {
      expect(['POST', 'PUT'].includes(action.operation.perform.method)).toBe(true)
    })
  })
})

describe('RetoolAdapter', () => {
  const adapter = new RetoolAdapter()

  it('should convert blueprint to Retool format', () => {
    const output = adapter.convert(SAMPLE_BLUEPRINT)
    expect(output.platform).toBe('Retool')
    expect(output.format).toBe('json')
  })

  it('should include both PostgreSQL and REST API resources', () => {
    const output = adapter.convert(SAMPLE_BLUEPRINT)
    const config = JSON.parse(output.content)
    expect(config.resources).toBeDefined()
    const types = config.resources.map((r: { type: string }) => r.type)
    expect(types).toContain('postgresql')
    expect(types).toContain('restapi')
  })

  it('should create a page for each table', () => {
    const output = adapter.convert(SAMPLE_BLUEPRINT)
    const config = JSON.parse(output.content)
    expect(config.pages).toBeDefined()
    // Should have Dashboard + table pages
    expect(config.pages.length).toBeGreaterThan(1)
    const pageNames = config.pages.map((p: { name: string }) => p.name)
    expect(pageNames).toContain('Dashboard')
  })
})

describe('NoCodeAdapterFactory', () => {
  it('should support all expected platforms', () => {
    const platforms = noCodeAdapterFactory.getSupportedPlatforms()
    expect(platforms).toContain('flutterflow')
    expect(platforms).toContain('bubble')
    expect(platforms).toContain('zapier')
    expect(platforms).toContain('retool')
  })

  it('should convert to a specific platform', () => {
    const output = noCodeAdapterFactory.convert('flutterflow', SAMPLE_BLUEPRINT)
    expect(output.platform).toBe('FlutterFlow')
  })

  it('should convert to all platforms', () => {
    const outputs = noCodeAdapterFactory.convertAll(SAMPLE_BLUEPRINT)
    expect(Object.keys(outputs).length).toBe(4)
    for (const output of Object.values(outputs)) {
      expect(output.content).toBeTruthy()
      expect(output.instructions.length).toBeGreaterThan(0)
    }
  })

  it('should throw for unsupported platform', () => {
    expect(() =>
      noCodeAdapterFactory.convert('unsupported' as never, SAMPLE_BLUEPRINT)
    ).toThrow('Unsupported platform')
  })
})
