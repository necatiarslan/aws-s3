"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// ToDo: Change to "fs/promises" when supporting nodejs>=14
const fs_1 = require("fs");
jest.mock("fs", () => ({ promises: { readFile: jest.fn() } }));
describe("slurpFile", () => {
    const UTF8 = "utf8";
    const getMockFileContents = (path, options = UTF8) => JSON.stringify({ path, options });
    beforeEach(() => {
        fs_1.promises.readFile.mockImplementation(async (path, options) => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return getMockFileContents(path, options);
        });
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe("makes one readFile call for a filepath irrespective of slurpFile calls", () => {
        // @ts-ignore: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/34617
        it.each([10, 100, 1000, 10000])("parallel calls: %d ", (num, done) => {
            jest.isolateModules(async () => {
                const { slurpFile } = require("./slurpFile");
                const mockPath = "/mock/path";
                const mockPathContent = getMockFileContents(mockPath);
                expect(fs_1.promises.readFile).not.toHaveBeenCalled();
                const fileContentArr = await Promise.all(Array(num).fill(slurpFile(mockPath)));
                expect(fileContentArr).toStrictEqual(Array(num).fill(mockPathContent));
                // There is one readFile call even through slurpFile is called in parallel num times.
                expect(fs_1.promises.readFile).toHaveBeenCalledTimes(1);
                expect(fs_1.promises.readFile).toHaveBeenCalledWith(mockPath, UTF8);
                done();
            });
        });
        it("two parallel calls and one sequential call", (done) => {
            jest.isolateModules(async () => {
                const { slurpFile } = require("./slurpFile");
                const mockPath = "/mock/path";
                const mockPathContent = getMockFileContents(mockPath);
                expect(fs_1.promises.readFile).not.toHaveBeenCalled();
                const fileContentArr = await Promise.all([slurpFile(mockPath), slurpFile(mockPath)]);
                expect(fileContentArr).toStrictEqual([mockPathContent, mockPathContent]);
                // There is one readFile call even through slurpFile is called in parallel twice.
                expect(fs_1.promises.readFile).toHaveBeenCalledTimes(1);
                expect(fs_1.promises.readFile).toHaveBeenCalledWith(mockPath, UTF8);
                const fileContent = await slurpFile(mockPath);
                expect(fileContent).toStrictEqual(mockPathContent);
                // There is one readFile call even through slurpFile is called for the third time.
                expect(fs_1.promises.readFile).toHaveBeenCalledTimes(1);
                done();
            });
        });
    });
    it("makes multiple readFile calls with based on filepaths", (done) => {
        jest.isolateModules(async () => {
            const { slurpFile } = require("./slurpFile");
            const mockPath1 = "/mock/path/1";
            const mockPathContent1 = getMockFileContents(mockPath1);
            const mockPath2 = "/mock/path/2";
            const mockPathContent2 = getMockFileContents(mockPath2);
            expect(fs_1.promises.readFile).not.toHaveBeenCalled();
            const fileContentArr = await Promise.all([slurpFile(mockPath1), slurpFile(mockPath2)]);
            expect(fileContentArr).toStrictEqual([mockPathContent1, mockPathContent2]);
            // There are two readFile calls as slurpFile is called in parallel with different filepaths.
            expect(fs_1.promises.readFile).toHaveBeenCalledTimes(2);
            expect(fs_1.promises.readFile).toHaveBeenNthCalledWith(1, mockPath1, UTF8);
            expect(fs_1.promises.readFile).toHaveBeenNthCalledWith(2, mockPath2, UTF8);
            const fileContent1 = await slurpFile(mockPath1);
            expect(fileContent1).toStrictEqual(mockPathContent1);
            const fileContent2 = await slurpFile(mockPath2);
            expect(fileContent2).toStrictEqual(mockPathContent2);
            // There is one readFile call even through slurpFile is called for the third time.
            expect(fs_1.promises.readFile).toHaveBeenCalledTimes(2);
            done();
        });
    });
});
//# sourceMappingURL=slurpFile.spec.js.map