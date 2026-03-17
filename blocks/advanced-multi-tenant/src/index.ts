/**
 * @file This module provides a minimal but real implementation for an Advanced Multi-Tenant RBAC (Role-Based Access Control) system
 * with Owner/Admin/User/Viewer roles and organizational hierarchy.
 */

/**
 * Defines the possible roles within the multi-tenant system.
 * Each role has a specific set of permissions, with Owner being the highest and Viewer the lowest.
 */
export enum UserRole {
  Owner = 'Owner',
  Admin = 'Admin',
  User = 'User',
  Viewer = 'Viewer',
}

/**
 * Represents a user in the system.
 */
export interface User {
  /** Unique identifier for the user. */
  id: string;
  /** The name of the user. */
  name: string;
  /** The email address of the user. */
  email: string;
  /** The role of the user within their assigned organization. */
  role: UserRole;
  /** The ID of the organization the user belongs to. */
  organizationId: string;
}

/**
 * Represents an organization in the multi-tenant hierarchy.
 */
export interface Organization {
  /** Unique identifier for the organization. */
  id: string;
  /** The name of the organization. */
  name: string;
  /** Optional ID of the parent organization, establishing a hierarchy. */
  parentOrganizationId?: string;
}

/**
 * A simplified permission set for demonstration purposes.
 * In a real application, this would be more granular.
 */
export type Permission = 'read' | 'write' | 'manage_users' | 'manage_billing' | 'view_reports';

/**
 * Manages Role-Based Access Control (RBAC) and organizational hierarchy.
 * This class provides methods to check permissions, manage users within organizations,
 * and navigate the organizational structure.
 */
export class RBACService {
  private users: User[];
  private organizations: Organization[];
  private rolePermissions: Map<UserRole, Set<Permission>>;

  /**
   * Initializes the RBACService with a list of users and organizations.
   * @param initialUsers An array of initial users.
   * @param initialOrganizations An array of initial organizations.
   */
  constructor(initialUsers: User[] = [], initialOrganizations: Organization[] = []) {
    this.users = initialUsers;
    this.organizations = initialOrganizations;
    this.rolePermissions = new Map<UserRole, Set<Permission>>();
    this.initializeRolePermissions();
  }

  /**
   * Sets up the default permissions for each role.
   * This can be extended or loaded from a configuration in a real application.
   */
  private initializeRolePermissions(): void {
    this.rolePermissions.set(UserRole.Viewer, new Set(['read', 'view_reports']));
    this.rolePermissions.set(UserRole.User, new Set(['read', 'write', 'view_reports']));
    this.rolePermissions.set(UserRole.Admin, new Set(['read', 'write', 'manage_users', 'view_reports']));
    this.rolePermissions.set(UserRole.Owner, new Set(['read', 'write', 'manage_users', 'manage_billing', 'view_reports']));
  }

  /**
   * Checks if a user has a specific permission within their organization.
   * @param userId The ID of the user.
   * @param permission The permission to check.
   * @returns True if the user has the permission, false otherwise.
   */
  public hasPermission(userId: string, permission: Permission): boolean {
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      return false;
    }
    const permissions = this.rolePermissions.get(user.role);
    return permissions ? permissions.has(permission) : false;
  }

  /**
   * Assigns a new role to a user within their organization.
   * @param userId The ID of the user.
   * @param newRole The new role to assign.
   * @returns True if the role was successfully assigned, false if the user was not found.
   */
  public assignRole(userId: string, newRole: UserRole): boolean {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return false;
    }
    this.users[userIndex].role = newRole;
    return true;
  }

  /**
   * Retrieves all users belonging to a specific organization.
   * @param organizationId The ID of the organization.
   * @returns An array of users in the specified organization.
   */
  public getUsersInOrganization(organizationId: string): User[] {
    return this.users.filter(user => user.organizationId === organizationId);
  }

  /**
   * Retrieves an organization by its ID.
   * @param organizationId The ID of the organization.
   * @returns The Organization object if found, otherwise undefined.
   */
  public getOrganizationById(organizationId: string): Organization | undefined {
    return this.organizations.find(org => org.id === organizationId);
  }

  /**
   * Retrieves all child organizations for a given parent organization.
   * @param parentOrganizationId The ID of the parent organization.
   * @returns An array of child organizations.
   */
  public getChildOrganizations(parentOrganizationId: string): Organization[] {
    return this.organizations.filter(org => org.parentOrganizationId === parentOrganizationId);
  }

  /**
   * Retrieves all organizations in the hierarchy starting from a given organization (inclusive).
   * This performs a depth-first search to find all descendants.
   * @param startOrganizationId The ID of the organization to start the hierarchy search from.
   * @returns An array of organizations in the hierarchy.
   */
  public getOrganizationsInHierarchy(startOrganizationId: string): Organization[] {
    const hierarchy: Organization[] = [];
    const queue: string[] = [startOrganizationId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentOrgId = queue.shift();
      if (!currentOrgId || visited.has(currentOrgId)) {
        continue;
      }

      visited.add(currentOrgId);
      const currentOrg = this.getOrganizationById(currentOrgId);
      if (currentOrg) {
        hierarchy.push(currentOrg);
        const children = this.getChildOrganizations(currentOrg.id);
        for (const child of children) {
          queue.push(child.id);
        }
      }
    }
    return hierarchy;
  }

  /**
   * Adds a new user to the system.
   * @param user The user object to add.
   */
  public addUser(user: User): void {
    if (!this.users.some(u => u.id === user.id)) {
      this.users.push(user);
    }
  }

  /**
   * Adds a new organization to the system.
   * @param organization The organization object to add.
   */
  public addOrganization(organization: Organization): void {
    if (!this.organizations.some(org => org.id === organization.id)) {
      this.organizations.push(organization);
    }
  }
}
