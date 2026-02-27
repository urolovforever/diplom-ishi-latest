import { useAuth } from './useAuth';

export function usePermission() {
  const { user, hasRole } = useAuth();

  return {
    canManageUsers: hasRole('super_admin', 'qomita_rahbar', 'konfessiya_rahbari', 'dt_rahbar'),
    canViewAIDashboard: hasRole('super_admin', 'qomita_rahbar', 'qomita_xodimi'),
    canViewReports: hasRole('super_admin', 'qomita_rahbar', 'qomita_xodimi'),
    canViewAuditLog: hasRole('super_admin', 'qomita_rahbar'),
    canManageSettings: hasRole('super_admin', 'qomita_xodimi'),
    canManageOrganizations: hasRole('super_admin', 'qomita_rahbar', 'konfessiya_rahbari', 'dt_rahbar'),
    canUploadDocuments: !!user,
    canManageHoneypots: hasRole('super_admin', 'qomita_xodimi'),
    canManageAlertRules: hasRole('super_admin', 'qomita_xodimi'),
    canViewAccessLogs: hasRole('super_admin', 'qomita_rahbar'),
    canReviewAnomalies: hasRole('super_admin', 'qomita_rahbar'),
  };
}
