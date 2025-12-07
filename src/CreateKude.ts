import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';
import * as path from 'path';

// Using any type for pdfkit to avoid TypeScript compilation issues
const PDFDocument: any = require('pdfkit');

interface DocumentData {
  tipoDocumento: number;
  tipoDocumentoDescripcion: string;
  timbrado: string;
  establecimiento: string;
  punto: string;
  numero: string;
  serie: string | null;
}

interface JasperParameters {
  REPORT_LOCALE?: string;
  [key: string]: any;
}

interface ItemData {
  dCodInt?: string;
  dDesProSer?: string;
  dCantProSer?: string | number;
  dPUniProSer?: string | number;
  dTotBruOpeItem?: string | number;
}

type DocumentType = 1 | 2 | 3 | 4 | 5 | 6 | 7;

class CreateKude {
  private xmlParser: XMLParser;

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
  }

  public static async main(xmlContent: string, classPath: string): Promise<Buffer> {
    const instance = new CreateKude();
    return await instance.run(xmlContent, classPath);
  }

  private getTemplateName(tipoDocumento: DocumentType): string {
    switch (tipoDocumento) {
      case 1: return 'Factura.jasper';
      case 2: return 'FacturaImportacion.jasper';
      case 3: return 'FacturaExportacion.jasper';
      case 4: return 'AutoFactura.jasper';
      case 5: return 'NotaCredito.jasper';
      case 6: return 'NotaDebito.jasper';
      case 7: return 'NotaRemision.jasper';
      default: throw new Error(`Tipo de documento no soportado: ${tipoDocumento}`);
    }
  }

  private async run(xmlContent: string, classPath: string): Promise<Buffer> {
    try {
      const dataFromXML = this.getTipoDocumentoFromXML(xmlContent);
      const tipoDocumento = dataFromXML.tipoDocumento;

      // Default parameters
      let parametros: Record<string, any> = {};
      parametros.REPORT_LOCALE = 'es_PY';

      // Generate PDF buffer directly
      const pdfBuffer = await this.generatePDF(xmlContent, dataFromXML, parametros, classPath);

      return pdfBuffer;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  private generatePDF(xmlContent: string, documentData: DocumentData, parametros: Record<string, any>, classPath: string ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      const os = require('os');
      const crypto = require('crypto');

      try {
        // Create temporary directory for output
        const tempDir = path.join(os.tmpdir(), 'kude-' + crypto.randomBytes(8).toString('hex'));
        require('fs').mkdirSync(tempDir, { recursive: true });

        // Build classpath including all jasperLibs
        const jasperLibsPath = path.join(classPath, 'jasperLibs');
        const libFiles = require('fs').readdirSync(jasperLibsPath)
          .filter((file: string) => file.endsWith('.jar'))
          .map((file: string) => path.join(jasperLibsPath, file));

        const classPathArg = [path.join(__dirname, 'CreateKude.jar'), ...libFiles].join(require('path').delimiter);

        // Prepare arguments for JAR execution
        const args = [
          xmlContent,                            // args[0]: XML content (string)
          path.join(classPath, 'DE'),            // args[1]: Jasper templates path
          tempDir,                               // args[2]: Output directory
          JSON.stringify(parametros)             // args[3]: Parameters as JSON
        ];

        // Execute JAR file
        const jarCommand = `java -cp "${classPathArg}" CreateKude ${args.map(arg => `"${arg}"`).join(' ')}`;

        exec(jarCommand, { cwd: __dirname }, (error: any, stdout: string, stderr: string) => {
          if (error) {
            console.error('Error executing JAR:', error);
            console.error('stderr:', stderr);
            reject(error);
            return;
          }

          try {
            // The JAR generates a PDF with the name based on document data
            const pdfFileName = `${documentData.tipoDocumentoDescripcion}_${documentData.timbrado}-${documentData.establecimiento}-${documentData.punto}-${documentData.numero}${documentData.serie ? '-' + documentData.serie : ''}.pdf`;
            const pdfPath = path.join(tempDir, pdfFileName);

            // Read the generated PDF file
            const pdfBuffer = require('fs').readFileSync(pdfPath);

            // Clean up temporary directory
            require('fs').rmSync(tempDir, { recursive: true, force: true });

            resolve(pdfBuffer);
          } catch (readError) {
            console.error('Error reading generated PDF:', readError);
            reject(readError);
          }
        });
      } catch (error) {
        reject(error);
      }



      try {
        const doc = new PDFDocument();
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks as any)));
        doc.on('error', reject);

        // Parse XML to extract item data (similar to JasperReports data source)
        const parsedXMLData = this.xmlParser.parse(xmlContent);

        // Header
        doc.fontSize(18).text('KUDE - Factura Electrónica', { align: 'center' });
        doc.moveDown();

        // Document info
        doc.fontSize(12)
          .text(`Tipo Documento: ${documentData.tipoDocumentoDescripcion}`)
          .text(`Timbrado: ${documentData.timbrado}`)
          .text(`Establecimiento: ${documentData.establecimiento}`)
          .text(`Punto: ${documentData.punto}`)
          .text(`Número: ${documentData.numero}`);
        if (documentData.serie) {
          doc.text(`Serie: ${documentData.serie}`);
        }
        doc.moveDown();

        // Try to extract and display items from XML
        try {
          const rDE = parsedXMLData.rDE;
          const DE = rDE.DE;
          const gCamItems = DE.gCamItem;

          if (gCamItems) {
            doc.fontSize(14).text('Items:', { underline: true });
            doc.moveDown();

            const items = Array.isArray(gCamItems) ? gCamItems : [gCamItems];

            items.forEach((item: any, index: number) => {
              doc.fontSize(10)
                .text(`Item ${index + 1}:`)
                .text(`  Código: ${item.dCodInt || 'N/A'}`)
                .text(`  Descripción: ${item.dDesProSer || 'N/A'}`)
                .text(`  Cantidad: ${item.dCantProSer || 'N/A'}`)
                .text(`  Precio: ${item.dPUniProSer || 'N/A'}`);
              if (item.dTotBruOpeItem) {
                doc.text(`  Total: ${item.dTotBruOpeItem}`);
              }
              doc.moveDown(0.5);
            });
          }
        } catch (error) {
          doc.fontSize(10).text('No se pudieron extraer los items del XML');
          console.warn('Error extracting items:', error);
        }

        // Add parameters if any
        if (Object.keys(parametros).length > 0) {
          doc.moveDown();
          doc.fontSize(12).text('Parámetros:', { underline: true });
          doc.fontSize(8).text(JSON.stringify(parametros, null, 2));
        }

        doc.moveDown();
        doc.fontSize(8).text('Generado con Node.js/TypeScript - Reemplazo de JasperReports', { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private getTipoDocumentoFromXML(xmlContent: string): DocumentData {
    try {

      const parsedXML = this.xmlParser.parse(xmlContent);

      // Navigate through the XML structure as in the Java version
      const rDE = parsedXML.rDE;
      const DE = rDE.DE;
      const gTimb = DE.gTimb;

      const tipoDocumento = parseInt(DE.iTiDE);
      const tipoDocumentoDescripcion = DE.dDesTiDE;
      const timbrado = DE.dNumTim;
      const establecimiento = DE.dEst;
      const punto = DE.dPunExp;
      const numero = DE.dNumDoc;
      const serie = DE.dSerieNum || null;

      return {
        tipoDocumento,
        tipoDocumentoDescripcion,
        timbrado,
        establecimiento,
        punto,
        numero,
        serie
      };
    } catch (error) {
      throw new Error(`Error parsing XML: ${(error as Error).message}`);
    }
  }
}


export default CreateKude;
