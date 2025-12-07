import kudeGen from "./KUDEGen";

class QRGen {
  generateKUDE = (
    xmlSigned: Buffer,
    logo: Buffer,
    srcJasper: string,
    jsonParam?: any
  ): Promise<Buffer> => {
    return kudeGen.generateKUDE(xmlSigned, logo, srcJasper, jsonParam);
  };
}

export default new QRGen();