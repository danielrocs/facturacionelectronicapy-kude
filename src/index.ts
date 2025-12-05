import kudeGen from "./KUDEGen";
import fs from "fs";
import path from "path";

class QRGen {
  generateKUDE = async (
    java8Path: string,
    xmlSigned: string,
    urlLogo: string,
    jsonParam?: any
  ): Promise<Buffer> => {
    // Call generateKUDE - returns a buffer, no files are written to disk
    const pdfBuffer = await kudeGen.generateKUDE(java8Path, xmlSigned, urlLogo, jsonParam);
    
    return pdfBuffer;
  };
}

export default new QRGen();
