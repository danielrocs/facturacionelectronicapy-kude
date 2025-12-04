import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

class KUDEGen {
  /**
   * Genera el archivo KUDE para la Factura Electronica
   * @param xml
   * @returns Buffer del archivo PDF generado
   */
  generateKUDE(
    java8Path: string,
    xml: string, //XML Content or XML Path
    srcJasper: string, //Path de los archivos .jasper
    destFolder?: string, //Path destino del Archivo PDF (opcional, usa temp si no se proporciona)
    jsonParam?: any //Parámetros a enviar al reporte en formato JSON
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      const classPath = "" + __dirname + "/jasperLibs/";
      const jarFile = "" + __dirname + "/CreateKude.jar";
      const tmpXMLToSign = "" + __dirname + "/xml_sign_temp.xml";

      if (xml.indexOf(" ") > -1) {
        reject(new Error("El parámetro 'xml' no debe contener espacios"));
        return;
      }

      if (srcJasper.indexOf(" ") > -1) {
        reject(new Error("El parámetro 'srcJasper' no debe contener espacios"));
        return;
      }

      // Use temporary directory if destFolder is not provided
      const useTempDir = !destFolder;
      let tempDestFolder: string;
      
      if (useTempDir) {
        tempDestFolder = path.join(os.tmpdir(), `kude_${Date.now()}_${Math.random().toString(36).substring(7)}`);
        // Create temp directory if it doesn't exist
        if (!fs.existsSync(tempDestFolder)) {
          fs.mkdirSync(tempDestFolder, { recursive: true });
        }
      } else {
        tempDestFolder = destFolder;
        if (tempDestFolder.indexOf(" ") > -1) {
          reject(
            new Error("El parámetro 'destFolder' no debe contener espacios")
          );
          return;
        }
      }

      const fullCommand = `"${java8Path}" -Dfile.encoding=IBM850 -classpath "${classPath}" -jar "${jarFile}" ${xml} ${srcJasper} ${tempDestFolder} "${jsonParam}"`;
      console.log("fullCommand", fullCommand);
      exec(
        fullCommand,
        { encoding: "UTF-8", maxBuffer: 1024 * 1024 },
        (error: any, stdout: any, stderr: any) => {
          if (error) {
            // Clean up temp directory if we created it
            if (useTempDir && fs.existsSync(tempDestFolder)) {
              try {
                fs.rmSync(tempDestFolder, { recursive: true, force: true });
              } catch (cleanupErr) {
                console.error("Error cleaning up temp directory:", cleanupErr);
              }
            }
            reject(error);
            return;
          }
          if (stderr) {
            // Clean up temp directory if we created it
            if (useTempDir && fs.existsSync(tempDestFolder)) {
              try {
                fs.rmSync(tempDestFolder, { recursive: true, force: true });
              } catch (cleanupErr) {
                console.error("Error cleaning up temp directory:", cleanupErr);
              }
            }
            reject(stderr);
            return;
          }

          try {
            // Find the generated PDF file in the destination folder
            const files = fs.readdirSync(tempDestFolder);
            const pdfFile = files.find((file: string) => file.endsWith('.pdf'));
            
            if (!pdfFile) {
              const errorMsg = `No PDF file found in destination folder: ${tempDestFolder}`;
              // Clean up temp directory if we created it
              if (useTempDir && fs.existsSync(tempDestFolder)) {
                try {
                  fs.rmSync(tempDestFolder, { recursive: true, force: true });
                } catch (cleanupErr) {
                  console.error("Error cleaning up temp directory:", cleanupErr);
                }
              }
              reject(new Error(errorMsg));
              return;
            }
            
            const pdfPath = path.join(tempDestFolder, pdfFile);
            const fileBuffer = fs.readFileSync(pdfPath);
            
            // Clean up the PDF file (and temp directory if we created it)
            try {
              fs.unlinkSync(pdfPath);
              if (useTempDir && fs.existsSync(tempDestFolder)) {
                fs.rmSync(tempDestFolder, { recursive: true, force: true });
              }
            } catch (cleanupErr) {
              console.error("Error cleaning up file:", cleanupErr);
            }
            
            resolve(fileBuffer);
          } catch (err) {
            // Clean up temp directory if we created it
            if (useTempDir && fs.existsSync(tempDestFolder)) {
              try {
                fs.rmSync(tempDestFolder, { recursive: true, force: true });
              } catch (cleanupErr) {
                console.error("Error cleaning up temp directory:", cleanupErr);
              }
            }
            reject(err);
          }
        }
      );
    });
  }
}

export default new KUDEGen();
