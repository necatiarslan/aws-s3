"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getProfileData_1 = require("./getProfileData");
describe(getProfileData_1.getProfileData.name, () => {
    it("returns empty for no data", () => {
        expect((0, getProfileData_1.getProfileData)({})).toStrictEqual({});
    });
    it("returns default profile if present", () => {
        const mockInput = { default: { key: "value" } };
        expect((0, getProfileData_1.getProfileData)(mockInput)).toStrictEqual(mockInput);
    });
    it("skips profiles without prefix profile", () => {
        const mockInput = { test: { key: "value" } };
        expect((0, getProfileData_1.getProfileData)(mockInput)).toStrictEqual({});
    });
    it("skips profiles with different prefix", () => {
        const mockInput = { "not-profile test": { key: "value" } };
        expect((0, getProfileData_1.getProfileData)(mockInput)).toStrictEqual({});
    });
    describe("normalizes profile names", () => {
        const getMockProfileData = (profileName) => [1, 2, 3]
            .map((num) => [`key_${profileName}_${num}`, `value_${profileName}_${num}`])
            .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
        const getMockOutput = (profileNames) => profileNames.reduce((acc, profileName) => ({ ...acc, [profileName]: getMockProfileData(profileName) }), {});
        const getMockInput = (mockOutput) => Object.entries(mockOutput).reduce((acc, [key, value]) => ({ ...acc, [`profile ${key}`]: value }), {});
        it("single profile", () => {
            const mockOutput = getMockOutput(["one"]);
            const mockInput = getMockInput(mockOutput);
            expect((0, getProfileData_1.getProfileData)(mockInput)).toStrictEqual(mockOutput);
        });
        it("two profiles", () => {
            const mockOutput = getMockOutput(["one", "two"]);
            const mockInput = getMockInput(mockOutput);
            expect((0, getProfileData_1.getProfileData)(mockInput)).toStrictEqual(mockOutput);
        });
        it("three profiles", () => {
            const mockOutput = getMockOutput(["one", "two", "three"]);
            const mockInput = getMockInput(mockOutput);
            expect((0, getProfileData_1.getProfileData)(mockInput)).toStrictEqual(mockOutput);
        });
        it("with default", () => {
            const defaultInput = { default: { key: "value" } };
            const mockOutput = getMockOutput(["one"]);
            const mockInput = getMockInput(mockOutput);
            expect((0, getProfileData_1.getProfileData)({ ...defaultInput, ...mockInput })).toStrictEqual({ ...defaultInput, ...mockOutput });
        });
        it("with profileName without prefix", () => {
            const profileWithPrefix = { test: { key: "value" } };
            const mockOutput = getMockOutput(["one"]);
            const mockInput = getMockInput(mockOutput);
            expect((0, getProfileData_1.getProfileData)({ ...profileWithPrefix, ...mockInput })).toStrictEqual(mockOutput);
        });
    });
});
//# sourceMappingURL=getProfileData.spec.js.map