const { exec } = require("child_process");
import fs from "fs";
import path from "path";

class KUDEGen {
  /**
   * Genera el archivo KUDE para la Factura Electronica
   * @param xml
   * @returns
   */
  generateKUDE(
    java8Path: string,
    xml: string, //XML Content or XML Path
    srcJasper: string, //Path de los archivos .jasper
    destFolder: string, //Path destino del Archivo PDF
    jsonParam?: any //Parámetros a enviar al reporte en formato JSON
  ):Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      const classPath = "" + __dirname + "/jasperLibs/";
      const jarFile = "" + __dirname + "/CreateKude.jar";
      const tmpXMLToSign = "" + __dirname + "/xml_sign_temp.xml";

      if (xml.indexOf(" ") > -1) {
        reject(new Error("El parámetro 'xml' no debe contener espacios"));
      }

      if (srcJasper.indexOf(" ") > -1) {
        reject(new Error("El parámetro 'srcJasper' no debe contener espacios"));
      }

      if (destFolder.indexOf(" ") > -1) {
        reject(
          new Error("El parámetro 'destFolder' no debe contener espacios")
        );
      }

      //fs.writeFileSync(tmpXMLToSign, xml, { encoding: "utf8" });
      const fullCommand = `"${java8Path}" -Dfile.encoding=IBM850 -classpath "${classPath}" -jar "${jarFile}" ${xml} ${srcJasper} ${destFolder} "${jsonParam}"`;
      console.log("fullCommand", fullCommand);
      exec(
        fullCommand,
        { encoding: "UTF-8", maxBuffer: 1024 * 1024 },
        (error: any, stdout: any, stderr: any) => {
          if (error) {
            reject(error);
            return;
          }
          if (stderr) {
            reject(stderr);
            return;
          }

          try {
            //file removed
            //fs.unlinkSync(tmpXMLToSign);
            
            // Determine the output file path
            // If destFolder ends with .pdf, it's likely the file path itself
            // Otherwise, check if stdout contains a file path, or use destFolder as directory
            let pdfFilePath = destFolder;
            
            // Check if destFolder is a directory (doesn't end with .pdf)
            if (!destFolder.toLowerCase().endsWith('.pdf')) {
              // Try to extract file path from stdout (Java programs often output the file path)
              const stdoutTrimmed = stdout.trim();
              if (stdoutTrimmed && fs.existsSync(stdoutTrimmed)) {
                pdfFilePath = stdoutTrimmed;
              } else {
                // If stdout doesn't contain a valid path, construct one
                // Common pattern: destFolder + filename from XML or a default name
                const xmlBasename = path.basename(xml, path.extname(xml));
                pdfFilePath = path.join(destFolder, `${xmlBasename}.pdf`);
              }
            }
            
            // Read the PDF file as a buffer
            if (!fs.existsSync(pdfFilePath)) {
              reject(new Error(`PDF file not found at: ${pdfFilePath}. stdout: ${stdout}`));
              return;
            }
            
            const pdfBuffer = fs.readFileSync(pdfFilePath);
            resolve(pdfBuffer);
          } catch (err) {
            console.error(err);
            reject(err);
          }
        }
      );
    });
    //});
  }
}

export default new KUDEGen();