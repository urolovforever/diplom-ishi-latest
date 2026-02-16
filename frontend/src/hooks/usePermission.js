import { useAuth } from './useAuth';

export function usePermission() {
  const { user, hasRole } = useAuth();

  return {
    canManageUsers: hasRole('super_admin'),
    canViewAIDashboard: hasRole('super_admin', 'security_auditor', 'it_admin'),
    canViewReports: hasRole('super_admin', 'security_auditor', 'qomita_rahbar'),
    canViewAuditLog: hasRole('super_admin', 'security_auditor'),
    canManageSettings: hasRole('super_admin', 'it_admin'),
    canManageConfessions: hasRole('super_admin', 'qomita_rahbar', 'confession_leader'),
    canUploadDocuments: !!user,
    canManageHoneypots: hasRole('super_admin', 'it_admin'),
    canManageAlertRules: hasRole('super_admin', 'it_admin'),
    canViewAccessLogs: hasRole('super_admin', 'security_auditor'),
    canReviewAnomalies: hasRole('super_admin', 'security_auditor'),
  };
}
