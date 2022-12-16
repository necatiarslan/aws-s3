"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const getCredentialsFilepath_1 = require("./getCredentialsFilepath");
const getHomeDir_1 = require("./getHomeDir");
jest.mock("path");
jest.mock("./getHomeDir");
describe(getCredentialsFilepath_1.getCredentialsFilepath.name, () => {
    const mockSeparator = "/";
    const mockHomeDir = "/mock/home/dir";
    const mockConfigFilepath = "/mock/file/path/credentials";
    const defaultConfigFilepath = `${mockHomeDir}/.aws/credentials`;
    afterEach(() => {
        jest.clearAllMocks();
    });
    it("returns configFilePath from default locations", () => {
        path_1.join.mockImplementation((...args) => args.join(mockSeparator));
        getHomeDir_1.getHomeDir.mockReturnValue(mockHomeDir);
        expect((0, getCredentialsFilepath_1.getCredentialsFilepath)()).toStrictEqual(defaultConfigFilepath);
        expect(getHomeDir_1.getHomeDir).toHaveBeenCalledWith();
        expect(path_1.join).toHaveBeenCalledWith(mockHomeDir, ".aws", "credentials");
    });
    it("returns configFile from location defined in environment", () => {
        const OLD_ENV = process.env;
        process.env = {
            ...OLD_ENV,
            [getCredentialsFilepath_1.ENV_CREDENTIALS_PATH]: mockConfigFilepath,
        };
        expect((0, getCredentialsFilepath_1.getCredentialsFilepath)()).toStrictEqual(mockConfigFilepath);
        expect(getHomeDir_1.getHomeDir).not.toHaveBeenCalled();
        expect(path_1.join).not.toHaveBeenCalled();
        process.env = OLD_ENV;
    });
});
//# sourceMappingURL=getCredentialsFilepath.spec.js.map