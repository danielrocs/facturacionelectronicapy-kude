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
    xml: string, //XML Content
    srcJasper: string, //Path de los archivos .jasper
    jsonParam?: any //Parámetros a enviar al reporte en formato JSON
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      const classPath = "" + __dirname + "/jasperLibs/";
      const jarFile = "" + __dirname + "/CreateKude.jar";

      if (xml.indexOf(" ") > -1) {
        reject(new Error("El parámetro 'xml' no debe contener espacios"));
        return;
      }

      if (srcJasper.indexOf(" ") > -1) {
        reject(new Error("El parámetro 'srcJasper' no debe contener espacios"));
        return;
      }

      // Always use temporary directory - files are cleaned up after reading the buffer
      const tempDestFolder = path.join(os.tmpdir(), `kude_${Date.now()}_${Math.random().toString(36).substring(7)}`);
      // Create temp directory if it doesn't exist
      if (!fs.existsSync(tempDestFolder)) {
        fs.mkdirSync(tempDestFolder, { recursive: true });
      }

      // Convert jsonParam to JSON string if provided, otherwise use empty JSON object
      let jsonParamStr = "{}";
      if (jsonParam !== undefined && jsonParam !== null) {
        if (typeof jsonParam === 'string') {
          // If it's already a string, try to parse it to validate it's JSON
          try {
            JSON.parse(jsonParam);
            jsonParamStr = jsonParam; // Valid JSON string, use as-is
          } catch {
            // If it's not valid JSON (e.g., a file path), use empty object
            jsonParamStr = "{}";
          }
        } else {
          // If it's an object, stringify it
          jsonParamStr = JSON.stringify(jsonParam);
        }
      }

      const fullCommand = `"${java8Path}" -Dfile.encoding=IBM850 -classpath "${classPath}" -jar "${jarFile}" ${xml} ${srcJasper} ${tempDestFolder} "${jsonParamStr}"`;
      console.log("fullCommand", fullCommand);
      exec(
        fullCommand,
        { encoding: "utf8", maxBuffer: 1024 * 1024 },
        (error: any, stdout: any, stderr: any) => {
          // Log output for debugging
          if (stdout) console.log("Java stdout:", stdout);
          if (stderr) console.log("Java stderr:", stderr);

          if (error) {
            // Clean up temp directory
            if (fs.existsSync(tempDestFolder)) {
              try {
                fs.rmSync(tempDestFolder, { recursive: true, force: true });
              } catch (cleanupErr) {
                console.error("Error cleaning up temp directory:", cleanupErr);
              }
            }
            const errorMsg = `Java process error: ${error.message}\nstdout: ${stdout || 'none'}\nstderr: ${stderr || 'none'}`;
            reject(new Error(errorMsg));
            return;
          }

          try {
            // Find the generated PDF file in the temporary folder
            const files = fs.readdirSync(tempDestFolder);
            const pdfFile = files.find((file: string) => file.endsWith('.pdf'));
            
            if (!pdfFile) {
              const errorMsg = `No PDF file found in destination folder: ${tempDestFolder}\nstdout: ${stdout || 'none'}\nstderr: ${stderr || 'none'}`;
              // Clean up temp directory
              if (fs.existsSync(tempDestFolder)) {
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
            
            // Clean up the PDF file and temp directory
            try {
              fs.unlinkSync(pdfPath);
              if (fs.existsSync(tempDestFolder)) {
                fs.rmSync(tempDestFolder, { recursive: true, force: true });
              }
            } catch (cleanupErr) {
              console.error("Error cleaning up file:", cleanupErr);
            }
            
            resolve(fileBuffer);
          } catch (err) {
            // Clean up temp directory
            if (fs.existsSync(tempDestFolder)) {
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
