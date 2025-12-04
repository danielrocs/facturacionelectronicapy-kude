import kudeGen from "./KUDEGen";
import fs from "fs";
import path from "path";

class QRGen {
  generateKUDE = async (
    java8Path: string,
    xmlSigned: string,
    urlLogo: string,
    ambiente: string
  ): Promise<Buffer> => {
    // Call generateKUDE - ambiente is the destination folder
    const pdfBuffer = await kudeGen.generateKUDE(java8Path, xmlSigned, urlLogo, ambiente);
    
    return pdfBuffer;
  };
}

export default new QRGen();
