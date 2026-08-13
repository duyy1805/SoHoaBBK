const requireExactPermission = (permissionCode) => (req,res,next) => {
    if (!req.user) return res.status(401).json({message:"Unauthenticated"});
    const permissions=Array.isArray(req.user.permissions)?req.user.permissions:[];
    if (!permissions.includes(permissionCode)) {
        return res.status(403).json({message:"Bạn không có quyền thực hiện thao tác này",requiredPermission:permissionCode});
    }
    next();
};

module.exports=requireExactPermission;
