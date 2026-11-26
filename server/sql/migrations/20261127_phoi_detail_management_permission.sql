/*
    Tách quyền quản lý chi tiết phôi khỏi QUAN_TRI_DM.
    Tạo role chuyên biệt để có thể gán trực tiếp trong màn quản trị người dùng.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.PERMISSIONS', N'U') IS NULL
        THROW 51000, N'Thiếu bảng dbo.PERMISSIONS.', 1;
    IF OBJECT_ID(N'dbo.ROLES', N'U') IS NULL
        THROW 51000, N'Thiếu bảng dbo.ROLES.', 1;
    IF OBJECT_ID(N'dbo.ROLE_PERMISSION', N'U') IS NULL
        THROW 51000, N'Thiếu bảng dbo.ROLE_PERMISSION.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.PERMISSIONS
        WHERE PermissionCode=N'QUAN_LY_CHI_TIET_PHOI'
    )
    BEGIN
        INSERT dbo.PERMISSIONS(PermissionCode,PermissionName)
        VALUES(N'QUAN_LY_CHI_TIET_PHOI',N'Quản lý chi tiết phôi');
    END;

    UPDATE dbo.PERMISSIONS
    SET PermissionName=N'Quản lý chi tiết phôi'
    WHERE PermissionCode=N'QUAN_LY_CHI_TIET_PHOI';

    IF NOT EXISTS (
        SELECT 1 FROM dbo.ROLES
        WHERE RoleCode=N'QUAN_LY_CHI_TIET_PHOI'
    )
    BEGIN
        INSERT dbo.ROLES(RoleCode,RoleName,TrangThai)
        VALUES(N'QUAN_LY_CHI_TIET_PHOI',N'Quản lý chi tiết phôi',1);
    END;

    UPDATE dbo.ROLES
    SET RoleName=N'Quản lý chi tiết phôi',TrangThai=1
    WHERE RoleCode=N'QUAN_LY_CHI_TIET_PHOI';

    INSERT dbo.ROLE_PERMISSION(RoleId,PermissionId)
    SELECT roleRow.Id,permissionRow.Id
    FROM dbo.ROLES roleRow
    CROSS JOIN dbo.PERMISSIONS permissionRow
    WHERE roleRow.RoleCode IN(N'QUAN_LY_CHI_TIET_PHOI',N'ADMIN')
      AND permissionRow.PermissionCode=N'QUAN_LY_CHI_TIET_PHOI'
      AND NOT EXISTS (
          SELECT 1 FROM dbo.ROLE_PERMISSION existing
          WHERE existing.RoleId=roleRow.Id
            AND existing.PermissionId=permissionRow.Id
      );

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

SELECT N'Đã tạo role và permission QUAN_LY_CHI_TIET_PHOI.' AS KetQua;
