"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const loadSharedConfigFiles_1 = require("./loadSharedConfigFiles");
const parseKnownFiles_1 = require("./parseKnownFiles");
jest.mock("./loadSharedConfigFiles");
describe(parseKnownFiles_1.parseKnownFiles.name, () => {
    const mockConfigFile = {
        mockConfigProfileName1: { configKey1: "configValue1" },
        mockConfigProfileName2: { configKey2: "configValue2" },
    };
    const mockCredentialsFile = {
        mockCredentialsProfileName1: { credsKey1: "credsValue1" },
        mockCredentialsProfileName2: { credsKey2: "credsValue2" },
    };
    afterEach(() => {
        jest.clearAllMocks();
    });
    it("gets parsedFiles from loadSharedConfigFiles", async () => {
        loadSharedConfigFiles_1.loadSharedConfigFiles.mockReturnValue(Promise.resolve({
            configFile: mockConfigFile,
            credentialsFile: mockCredentialsFile,
        }));
        const mockInit = { profile: "mockProfile" };
        const parsedFiles = await (0, parseKnownFiles_1.parseKnownFiles)(mockInit);
        expect(loadSharedConfigFiles_1.loadSharedConfigFiles).toHaveBeenCalledWith(mockInit);
        expect(parsedFiles).toEqual({
            ...mockConfigFile,
            ...mockCredentialsFile,
        });
    });
});
//# sourceMappingURL=parseKnownFiles.spec.js.map