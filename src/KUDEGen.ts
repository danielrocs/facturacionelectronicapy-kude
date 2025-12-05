import { exec } from "child_process";
import fs from "fs";
import path from "path"; // Import path for safer file handling

class KUDEGen {
  /**
   * Genera el archivo KUDE para la Factura Electronica y retorna un Buffer
   * @param java8Path Path al ejecutable de Java 8
   * @param xml Contenido XML o Path al XML
   * @param srcJasper Path de los archivos .jasper
   * @param destFolder Path destino donde el JAR guardará el PDF temporalmente
   * @param jsonParam Parámetros a enviar al reporte en formato JSON
   * @returns Promise<Buffer>
   */
  generateKUDE(
    java8Path: string,
    xml: string, 
    srcJasper: string, 
    destFolder: string, 
    jsonParam?: any 
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const classPath = path.join(__dirname, "jasperLibs");
      const jarFile = path.join(__dirname, "CreateKude.jar");

      // Validation logic
      if (xml.includes(" ")) return reject(new Error("El parámetro 'xml' no debe contener espacios"));
      if (srcJasper.includes(" ")) return reject(new Error("El parámetro 'srcJasper' no debe contener espacios"));
      if (destFolder.includes(" ")) return reject(new Error("El parámetro 'destFolder' no debe contener espacios"));

      // Command construction
      // Note: Added .trim() to jsonParam to ensure clean input
      const params = jsonParam ? `"${jsonParam}"` : "";
      const fullCommand = `"${java8Path}" -Dfile.encoding=IBM850 -classpath "${classPath}" -jar "${jarFile}" ${xml} ${srcJasper} ${destFolder} ${params}`;
      
      console.log("Executing KUDE Gen:", fullCommand);

      exec(
        fullCommand,
        { encoding: "UTF-8", maxBuffer: 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            console.error("Exec error:", error);
            return reject(error);
          }
          
          // Note: If stderr is just warnings, you might not want to reject immediately.
          // If the JAR treats warnings as fatal, keep this. Otherwise, consider logging it instead.
          if (stderr && stderr.trim().length > 0) {
             console.warn("KUDE Gen Stderr:", stderr);
             // return reject(new Error(stderr)); // Uncomment if stderr should fail the process
          }

          try {
            // ---------------------------------------------------------
            // CRITICAL STEP: Determine the path of the generated file
            // ---------------------------------------------------------
            
            // Scenario A: The JAR prints the absolute path of the generated PDF to stdout
            let generatedFilePath = stdout.trim();

            // Scenario B: If stdout is not just the path (e.g. contains logs), 
            // you might need to construct the path manually. 
            // Example:
            // const fileName = path.basename(xml).replace('.xml', '.pdf');
            // generatedFilePath = path.join(destFolder, fileName);

            if (!fs.existsSync(generatedFilePath)) {
               return reject(new Error(`Generated file not found at: ${generatedFilePath}`));
            }

            // Read the file into a Buffer
            const fileBuffer = fs.readFileSync(generatedFilePath);

            // OPTIONAL: Delete the file after reading if you only want it in memory
            // fs.unlinkSync(generatedFilePath);

            resolve(fileBuffer);

          } catch (err) {
            console.error("Error reading KUDE output file:", err);
            reject(err);
          }
        }
      );
    });
  }
}

export default new KUDEGen();