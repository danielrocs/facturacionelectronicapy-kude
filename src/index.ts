import kudeGen from "./KUDEGen";

class QRGen {
  generateKUDE = (
    javaPath: string,
    xmlSignedPath: string,
    srcJasperPath: string,
    destFolderPath: string,
    jsonParam?: any
  ): Promise<string> => {
    return await kudeGen.generateKUDE(javaPath, xmlSignedPath, srcJasperPath, destFolderPath, jsonParam);
  };
}