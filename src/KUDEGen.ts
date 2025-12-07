const { exec } = require("child_process");
import fs from "fs";
import CreateKude from "./CreateKude";

class KUDEGen {
  /**
   * Genera el archivo KUDE para la Factura Electronica
   * @param xml
   * @returns
   */
  generateKUDE(
    xml: string, //XML Content or XML Path
    srcJasper: string, //Path de los archivos .jasper
    logo?: Buffer,
    jsonParam?: any //Parámetros a enviar al reporte en formato JSON
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      const classPath = "" + __dirname + "/jasperLibs/";

      // if (xml.indexOf(" ") > -1) {
      //   reject(new Error("El parámetro 'xml' no debe contener espacios"));
      // }

      if (srcJasper.indexOf(" ") > -1) {
        reject(new Error("El parámetro 'srcJasper' no debe contener espacios"));
      }

      const pdfBuffer = await CreateKude.main(xml, classPath);
      
      console.log("pdfBuffer", pdfBuffer);

      resolve(pdfBuffer);
    });
  }
}

export default new KUDEGen();