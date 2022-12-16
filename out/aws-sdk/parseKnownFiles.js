"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseKnownFiles = void 0;
const loadSharedConfigFiles_1 = require("./loadSharedConfigFiles");
/**
 * Load profiles from credentials and config INI files and normalize them into a
 * single profile list.
 *
 * @internal
 */
const parseKnownFiles = async (init) => {
    const parsedFiles = await (0, loadSharedConfigFiles_1.loadSharedConfigFiles)(init);
    return {
        ...parsedFiles.configFile,
        ...parsedFiles.credentialsFile,
    };
};
exports.parseKnownFiles = parseKnownFiles;
//# sourceMappingURL=parseKnownFiles.js.map