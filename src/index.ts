import kudeGen from "./KUDEGen";

class QRGen {
  generateKUDE = (
    xmlSigned: string,
    srcJasper: string,
    logo?: Buffer,
    jsonParam?: any
  ): Promise<Buffer> => {
    return kudeGen.generateKUDE(xmlSigned, srcJasper, logo, jsonParam);
  };
}

export default new QRGen();