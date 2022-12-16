"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getConfigFilepath_1 = require("./getConfigFilepath");
const getCredentialsFilepath_1 = require("./getCredentialsFilepath");
const getProfileData_1 = require("./getProfileData");
const loadSharedConfigFiles_1 = require("./loadSharedConfigFiles");
const parseIni_1 = require("./parseIni");
const slurpFile_1 = require("./slurpFile");
jest.mock("./getConfigFilepath");
jest.mock("./getCredentialsFilepath");
jest.mock("./getProfileData");
jest.mock("./parseIni");
jest.mock("./slurpFile");
describe("loadSharedConfigFiles", () => {
    const mockConfigFilepath = "/mock/file/path/config";
    const mockCredsFilepath = "/mock/file/path/credentials";
    const mockSharedConfigFiles = {
        configFile: mockConfigFilepath,
        credentialsFile: mockCredsFilepath,
    };
    beforeEach(() => {
        getConfigFilepath_1.getConfigFilepath.mockReturnValue(mockConfigFilepath);
        getCredentialsFilepath_1.getCredentialsFilepath.mockReturnValue(mockCredsFilepath);
        parseIni_1.parseIni.mockImplementation((args) => args);
        getProfileData_1.getProfileData.mockImplementation((args) => args);
        slurpFile_1.slurpFile.mockImplementation((path) => Promise.resolve(path));
    });
    afterEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });
    it("returns configFile and credentialsFile from default locations", async () => {
        const sharedConfigFiles = await (0, loadSharedConfigFiles_1.loadSharedConfigFiles)();
        expect(sharedConfigFiles).toStrictEqual(mockSharedConfigFiles);
        expect(getConfigFilepath_1.getConfigFilepath).toHaveBeenCalledWith();
        expect(getCredentialsFilepath_1.getCredentialsFilepath).toHaveBeenCalledWith();
    });
    it("returns configFile and credentialsFile from init if defined", async () => {
        const sharedConfigFiles = await (0, loadSharedConfigFiles_1.loadSharedConfigFiles)({
            filepath: mockCredsFilepath,
            configFilepath: mockConfigFilepath,
        });
        expect(sharedConfigFiles).toStrictEqual(mockSharedConfigFiles);
        expect(getConfigFilepath_1.getConfigFilepath).not.toHaveBeenCalled();
        expect(getCredentialsFilepath_1.getCredentialsFilepath).not.toHaveBeenCalled();
    });
    describe("swallows error and returns empty configuration", () => {
        it("when readFile throws error", async () => {
            slurpFile_1.slurpFile.mockRejectedValue("error");
            const sharedConfigFiles = await (0, loadSharedConfigFiles_1.loadSharedConfigFiles)();
            expect(sharedConfigFiles).toStrictEqual({ configFile: {}, credentialsFile: {} });
        });
        it("when parseIni throws error", async () => {
            parseIni_1.parseIni.mockRejectedValue("error");
            const sharedConfigFiles = await (0, loadSharedConfigFiles_1.loadSharedConfigFiles)();
            expect(sharedConfigFiles).toStrictEqual({ configFile: {}, credentialsFile: {} });
        });
        it("when normalizeConfigFile throws error", async () => {
            getProfileData_1.getProfileData.mockRejectedValue("error");
            const sharedConfigFiles = await (0, loadSharedConfigFiles_1.loadSharedConfigFiles)();
            expect(sharedConfigFiles).toStrictEqual({
                configFile: {},
                credentialsFile: mockCredsFilepath,
            });
        });
    });
});
//# sourceMappingURL=loadSharedConfigFiles.spec.js.map