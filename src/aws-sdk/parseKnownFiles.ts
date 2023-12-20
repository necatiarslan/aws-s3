import { ParsedIniData } from "@aws-sdk/types";

import { loadSharedConfigFiles, SharedConfigInit } from "./loadSharedConfigFiles";

export interface SourceProfileInit extends SharedConfigInit {
  /**
   * The configuration profile to use.
   */
  profile?: string;
}

/**
 * Load profiles from credentials and config INI files and normalize them into a
 * single profile list.
 *
 * @internal
 */
export const parseKnownFiles = async (init: SourceProfileInit): Promise<ParsedIniData> => {
  const parsedFiles = await loadSharedConfigFiles(init);
  let returnProfile: { [key: string]: any } = {}; // Add index signature
  if (init !== undefined && init.profile !== undefined) {
    var name = init.profile;
    returnProfile[name] = { ...parsedFiles.configFile[name], ...parsedFiles.credentialsFile[name] }; // Remove extra closing brace
  }
  else{
  returnProfile = { ...parsedFiles.configFile, ...parsedFiles.credentialsFile };}
  return returnProfile;
};
