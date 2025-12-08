const { exec } = require("child_process");
import fs from "fs";

class KUDEGen {
  /**
   * Genera el archivo KUDE para la Factura Electronica
   * @param xml
   * @returns
   */
  generateKUDE(
    java8Path: string,
    xmlSignedPath: string, //XML Content or XML Path
    srcJasperPath: string, //Path de los archivos .jasper
    destFolderPath: string, //Path destino del Archivo PDF
    jsonParam?: any //Parámetros a enviar al reporte en formato JSON
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const classPath = "" + __dirname + "/jasperLibs/";
      const jarFile = "" + __dirname + "/CreateKude.jar";
      const tmpXMLToSign = "" + __dirname + "/xml_sign_temp.xml";

      if (xmlSignedPath.indexOf(" ") > -1) {
        reject(new Error("El parámetro 'xml' no debe contener espacios"));
      }

      if (srcJasperPath.indexOf(" ") > -1) {
        reject(new Error("El parámetro 'srcJasper' no debe contener espacios"));
      }

      if (destFolderPath.indexOf(" ") > -1) {
        reject(
          new Error("El parámetro 'destFolder' no debe contener espacios")
        );
      }

      //fs.writeFileSync(tmpXMLToSign, xml, { encoding: "utf8" });
      const fullCommand = `"${java8Path}" -Dfile.encoding=IBM850 -classpath "${classPath}" -jar "${jarFile}" ${xmlSignedPath} ${srcJasperPath} ${destFolderPath} "${jsonParam}"`;
      //console.log("fullCommand", fullCommand);
      exec(
        fullCommand,
        { encoding: "UTF-8", maxBuffer: 1024 * 1024 },
        (error: any, stdout: any, stderr: any) => {
          if (error) {
            reject(error);
          }
          if (stderr) {
            reject(stderr);
          }

          try {
            //file removed
            //fs.unlinkSync(tmpXMLToSign);
          } catch (err) {
            console.error(err);
          }

          //console.log(`signedXML: ${stdout}`);

          //resolve(Buffer.from(`${stdout}`,'utf8').toString());
          //fs.writeFileSync(tmpXMLToSign + ".result.xml", `${stdout}`, {encoding: 'utf8'});
          //let resultXML = fs.readFileSync(tmpXMLToSign + ".result.xml", {encoding: 'utf8'});
          resolve(stdout);
        }
      );
    });
    //});
  }
}

export default new KUDEGen();