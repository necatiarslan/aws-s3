"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const getConfigFilepath_1 = require("./getConfigFilepath");
const getHomeDir_1 = require("./getHomeDir");
jest.mock("path");
jest.mock("./getHomeDir");
describe(getConfigFilepath_1.getConfigFilepath.name, () => {
    const mockSeparator = "/";
    const mockHomeDir = "/mock/home/dir";
    const mockConfigFilepath = "/mock/file/path/config";
    const defaultConfigFilepath = `${mockHomeDir}/.aws/config`;
    afterEach(() => {
        jest.clearAllMocks();
    });
    it("returns configFilePath from default locations", () => {
        path_1.join.mockImplementation((...args) => args.join(mockSeparator));
        getHomeDir_1.getHomeDir.mockReturnValue(mockHomeDir);
        expect((0, getConfigFilepath_1.getConfigFilepath)()).toStrictEqual(defaultConfigFilepath);
        expect(getHomeDir_1.getHomeDir).toHaveBeenCalledWith();
        expect(path_1.join).toHaveBeenCalledWith(mockHomeDir, ".aws", "config");
    });
    it("returns configFile from location defined in environment", () => {
        const OLD_ENV = process.env;
        process.env = {
            ...OLD_ENV,
            [getConfigFilepath_1.ENV_CONFIG_PATH]: mockConfigFilepath,
        };
        expect((0, getConfigFilepath_1.getConfigFilepath)()).toStrictEqual(mockConfigFilepath);
        expect(getHomeDir_1.getHomeDir).not.toHaveBeenCalled();
        expect(path_1.join).not.toHaveBeenCalled();
        process.env = OLD_ENV;
    });
});
//# sourceMappingURL=getConfigFilepath.spec.js.map