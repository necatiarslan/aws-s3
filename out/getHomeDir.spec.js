"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = require("os");
const path_1 = require("path");
const getHomeDir_1 = require("./getHomeDir");
jest.mock("os");
describe(getHomeDir_1.getHomeDir.name, () => {
    const mockHOME = "mockHOME";
    const mockUSERPROFILE = "mockUSERPROFILE";
    const mockHOMEPATH = "mockHOMEPATH";
    const mockHOMEDRIVE = "mockHOMEDRIVE";
    const mockHomeDir = "mockHomeDir";
    const OLD_ENV = process.env;
    beforeEach(() => {
        os_1.homedir.mockReturnValue(mockHomeDir);
        process.env = {
            ...OLD_ENV,
            HOME: mockHOME,
            USERPROFILE: mockUSERPROFILE,
            HOMEPATH: mockHOMEPATH,
            HOMEDRIVE: mockHOMEDRIVE,
        };
    });
    afterEach(() => {
        process.env = OLD_ENV;
        jest.clearAllMocks();
        jest.resetModules();
    });
    it("returns value in process.env.HOME first", () => {
        expect((0, getHomeDir_1.getHomeDir)()).toEqual(mockHOME);
    });
    it("returns value in process.env.USERPROFILE second", () => {
        process.env = { ...process.env, HOME: undefined };
        expect((0, getHomeDir_1.getHomeDir)()).toEqual(mockUSERPROFILE);
    });
    describe("returns value in HOMEPATH third", () => {
        beforeEach(() => {
            process.env = { ...process.env, HOME: undefined, USERPROFILE: undefined };
        });
        it("uses value in process.env.HOMEDRIVE if it's set", () => {
            expect((0, getHomeDir_1.getHomeDir)()).toEqual(`${mockHOMEDRIVE}${mockHOMEPATH}`);
        });
        it("uses default if process.env.HOMEDRIVE is not set", () => {
            process.env = { ...process.env, HOMEDRIVE: undefined };
            expect((0, getHomeDir_1.getHomeDir)()).toEqual(`C:${path_1.sep}${mockHOMEPATH}`);
        });
    });
    it("returns value from homedir fourth", () => {
        process.env = { ...process.env, HOME: undefined, USERPROFILE: undefined, HOMEPATH: undefined };
        expect((0, getHomeDir_1.getHomeDir)()).toEqual(mockHomeDir);
    });
});
//# sourceMappingURL=getHomeDir.spec.js.map