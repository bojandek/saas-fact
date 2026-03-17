/**
 * Advanced Multi-Tenant Block
 * Implements role-based access control and organization hierarchy
 * Based on Postiz-app's multi-tenancy model
 */

import { PrismaClient } from '@prisma/client';

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  USER = 'USER',
  VIEWER = 'VIEWER',
}

interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

interface OrganizationSettings {
  id: string;
  organizationId: string;
  maxTeamMembers: number;
  maxProjects: number;
  allowPublicSharing: boolean;
  enforceSSO: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class AdvancedMultiTenantBlock {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Add a user to an organization with a specific role
   */
  async addMemberToOrganization(
    userId: string,
    organizationId: string,
    role: UserRole = UserRole.USER
  ): Promise<OrganizationMember> {
    return this.prisma.organizationMember.create({
      data: {
        userId,
        organizationId,
        role,
      },
    });
  }

  /**
   * Update a user's role in an organization
   */
  async updateMemberRole(
    userId: string,
    organizationId: string,
    newRole: UserRole
  ): Promise<OrganizationMember> {
    return this.prisma.organizationMember.update({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      data: {
        role: newRole,
      },
    });
  }

  /**
   * Remove a user from an organization
   */
  async removeMemberFromOrganization(
    userId: string,
    organizationId: string
  ): Promise<void> {
    await this.prisma.organizationMember.delete({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });
  }

  /**
   * Get all members of an organization
   */
  async getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    return this.prisma.organizationMember.findMany({
      where: { organizationId },
    });
  }

  /**
   * Check if a user has a specific role in an organization
   */
  async hasRole(
    userId: string,
    organizationId: string,
    requiredRole: UserRole
  ): Promise<boolean> {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!member) return false;

    const roleHierarchy = {
      [UserRole.OWNER]: 4,
      [UserRole.ADMIN]: 3,
      [UserRole.USER]: 2,
      [UserRole.VIEWER]: 1,
    };

    return roleHierarchy[member.role] >= roleHierarchy[requiredRole];
  }

  /**
   * Get organization settings
   */
  async getOrganizationSettings(organizationId: string): Promise<OrganizationSettings> {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });

    if (!settings) {
      // Create default settings if they don't exist
      return this.prisma.organizationSettings.create({
        data: {
          organizationId,
          maxTeamMembers: 50,
          maxProjects: 100,
          allowPublicSharing: true,
          enforceSSO: false,
        },
      });
    }

    return settings;
  }

  /**
   * Update organization settings
   */
  async updateOrganizationSettings(
    organizationId: string,
    settings: Partial<OrganizationSettings>
  ): Promise<OrganizationSettings> {
    return this.prisma.organizationSettings.upsert({
      where: { organizationId },
      update: settings,
      create: {
        organizationId,
        ...settings,
      } as any,
    });
  }

  /**
   * Check if an organization can add more members
   */
  async canAddMember(organizationId: string): Promise<boolean> {
    const settings = await this.getOrganizationSettings(organizationId);
    const memberCount = await this.prisma.organizationMember.count({
      where: { organizationId },
    });

    return memberCount < settings.maxTeamMembers;
  }

  /**
   * Get all organizations for a user
   */
  async getUserOrganizations(userId: string): Promise<OrganizationMember[]> {
    return this.prisma.organizationMember.findMany({
      where: { userId },
    });
  }
}

export type { OrganizationMember, OrganizationSettings };
