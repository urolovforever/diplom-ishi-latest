import { useAuth } from './useAuth';

export function usePermission() {
  const { user, hasRole } = useAuth();

  return {
    canManageUsers: hasRole('super_admin', 'konfessiya_rahbari', 'dt_rahbar'),
    canViewAIDashboard: hasRole('super_admin'),
    canViewReports: hasRole('super_admin'),
    canViewAuditLog: hasRole('super_admin'),
    canManageSettings: hasRole('super_admin'),
    canManageOrganizations: hasRole('super_admin', 'konfessiya_rahbari', 'dt_rahbar'),
    canUploadDocuments: !!user,
    canManageHoneypots: hasRole('super_admin'),
    canManageAlertRules: hasRole('super_admin'),
    canViewAccessLogs: hasRole('super_admin'),
    canReviewAnomalies: hasRole('super_admin'),
  };
}
