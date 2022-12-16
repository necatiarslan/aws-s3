"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfileData = void 0;
const profileKeyRegex = /^profile\s(["'])?([^\1]+)\1$/;
/**
 * Returns the profile data from parsed ini data.
 * * Returns data for `default`
 * * Reads profileName after profile prefix including/excluding quotes
 */
const getProfileData = (data) => Object.entries(data)
    // filter out non-profile keys
    .filter(([key]) => profileKeyRegex.test(key))
    // replace profile key with profile name
    .reduce((acc, [key, value]) => ({ ...acc, [profileKeyRegex.exec(key)[2]]: value }), {
    // Populate default profile, if present.
    ...(data.default && { default: data.default }),
});
exports.getProfileData = getProfileData;
//# sourceMappingURL=getProfileData.js.map