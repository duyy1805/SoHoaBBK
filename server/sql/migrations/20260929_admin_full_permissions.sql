/* ADMIN luôn nhận toàn bộ permission hiện có trong database của instance. */
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.ROLES WHERE RoleCode=N'ADMIN')
    THROW 52900,N'Thiếu role ADMIN.',1;

INSERT dbo.ROLE_PERMISSION(RoleId,PermissionId)
SELECT role.Id,permission.Id
FROM dbo.ROLES role
CROSS JOIN dbo.PERMISSIONS permission
WHERE role.RoleCode=N'ADMIN'
  AND NOT EXISTS (
      SELECT 1 FROM dbo.ROLE_PERMISSION currentMapping
      WHERE currentMapping.RoleId=role.Id
        AND currentMapping.PermissionId=permission.Id
  );
GO
