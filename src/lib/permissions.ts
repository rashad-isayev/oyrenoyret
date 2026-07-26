/**
 * Permission Utilities
 * 
 * Provides role-based access control (RBAC) helpers.
 * All permission checks should go through this module for consistency.
 */

import { USER_ROLES } from '../config/constants';

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

/**
 * Checks if a user has admin privileges
 * @param userRole The user's role
 * @returns True if user is an admin
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === USER_ROLES.ADMIN;
}
