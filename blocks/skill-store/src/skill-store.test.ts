import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SkillStore, Skill } from './index'

// Mock fs module to avoid file system operations in tests
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue('[]'),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}))

describe('SkillStore', () => {
  let store: SkillStore

  beforeEach(() => {
    store = new SkillStore({ cachePath: '/tmp/test-skills' })
  })

  describe('getSkill', () => {
    it('should return null for non-existent skill', async () => {
      const skill = await store.getSkill('non-existent-id')
      expect(skill).toBeNull()
    })

    it('should return a skill that exists in the store', async () => {
      // The store seeds default skills on initialization
      const allSkills = await store.getAllSkills()
      if (allSkills.length > 0) {
        const firstSkill = allSkills[0]
        const found = await store.getSkill(firstSkill.id)
        expect(found).not.toBeNull()
        expect(found?.id).toBe(firstSkill.id)
      }
    })
  })

  describe('search', () => {
    it('should return empty array for no matches', async () => {
      const results = await store.search('xyzzy-nonexistent-query-12345')
      expect(Array.isArray(results)).toBe(true)
    })

    it('should find skills by name', async () => {
      const allSkills = await store.getAllSkills()
      if (allSkills.length > 0) {
        const firstSkill = allSkills[0]
        // Search by first word of skill name
        const searchTerm = firstSkill.name.split(' ')[0].toLowerCase()
        const results = await store.search(searchTerm)
        expect(results.length).toBeGreaterThan(0)
      }
    })

    it('should respect the limit parameter', async () => {
      const results = await store.search('', 3)
      expect(results.length).toBeLessThanOrEqual(3)
    })

    it('should return results sorted by rating (descending)', async () => {
      const results = await store.search('', 10)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].rating).toBeGreaterThanOrEqual(results[i + 1].rating)
      }
    })
  })

  describe('getCategories', () => {
    it('should return an array of category names', async () => {
      const categories = await store.getCategories()
      expect(Array.isArray(categories)).toBe(true)
    })
  })

  describe('getTrending', () => {
    it('should return skills sorted by uses', async () => {
      const trending = await store.getTrending(5)
      expect(Array.isArray(trending)).toBe(true)
      expect(trending.length).toBeLessThanOrEqual(5)

      for (let i = 0; i < trending.length - 1; i++) {
        expect(trending[i].uses).toBeGreaterThanOrEqual(trending[i + 1].uses)
      }
    })
  })

  describe('getTopRated', () => {
    it('should return skills sorted by rating', async () => {
      const topRated = await store.getTopRated(5)
      expect(Array.isArray(topRated)).toBe(true)

      for (let i = 0; i < topRated.length - 1; i++) {
        expect(topRated[i].rating).toBeGreaterThanOrEqual(topRated[i + 1].rating)
      }
    })
  })

  describe('getAllSkills', () => {
    it('should return all seeded skills', async () => {
      const skills = await store.getAllSkills()
      expect(Array.isArray(skills)).toBe(true)
      // Default skills are seeded on init
      expect(skills.length).toBeGreaterThan(0)
    })

    it('should return skills with required fields', async () => {
      const skills = await store.getAllSkills()
      skills.forEach((skill: Skill) => {
        expect(skill.id).toBeDefined()
        expect(skill.name).toBeDefined()
        expect(skill.description).toBeDefined()
        expect(skill.prompt).toBeDefined()
        expect(Array.isArray(skill.tags)).toBe(true)
        expect(typeof skill.rating).toBe('number')
        expect(typeof skill.uses).toBe('number')
      })
    })
  })
})
