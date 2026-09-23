const path = require('path');
const dataRoot = path.resolve(process.env.APP_DATA_ROOT || path.join(__dirname, '..', 'data'));

module.exports = {
    dataRoot,
    uploadRoot: path.resolve(process.env.UPLOAD_ROOT || path.join(dataRoot, 'uploads')),
    privateUploadRoot: path.resolve(process.env.PRIVATE_UPLOAD_ROOT || path.join(dataRoot, 'private-uploads')),
    logRoot: path.resolve(process.env.LOG_ROOT || path.join(dataRoot, 'logs'))
};
