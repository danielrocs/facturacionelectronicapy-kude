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

  public static async main(args: string[]): Promise<void> {
    const instance = new CreateKude();
    await instance.run(args);
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

  private async run(args: string[]): Promise<void> {
    try {
      let xml: string | null = null;

      if (args.length > 0 && args[0] != null) {
        xml = args[0];
      } else {
        // Default path for development
        xml = "C:\\Users\\marco\\git\\tipscloud\\KUDE\\resources\\Extructura xml_DE.xml";
      }

      const dataFromXML = this.getTipoDocumentoFromXML(xml);
      const tipoDocumento = dataFromXML.tipoDocumento;

      let jasperPath: string | null = null;
      if (args.length > 1 && args[1] != null) {
        jasperPath = args[1];
        console.log("jasper path del par 1 vale " + jasperPath);

        let pathDestino: string | null = null;
        if (args.length > 2 && args[2] != null) {
          pathDestino = args[2];

          let parametros: Record<string, any> = {};
          if (args.length > 3 && args[3] != null) {
            try {
              parametros = JSON.parse(args[3]);
            } catch (error) {
              console.error("Error ignorado... No se pudo convertir " + args[3] + " a Objeto!");
            }
          }

          // Add locale parameter
          parametros.REPORT_LOCALE = 'es_PY';

          const templateName = this.getTemplateName(tipoDocumento as DocumentType);

          const fullJasperPath = path.join(jasperPath, templateName);
          console.log("----" + fullJasperPath);

          if (!fs.existsSync(fullJasperPath)) {
            throw new Error("Archivo " + fullJasperPath + " no encontrado.!");
          }

          try {
            // Generate PDF using Node.js PDF generation
            // Since JasperReports templates are binary, we'll create a basic PDF structure
            // In a full implementation, you might want to convert Jasper templates to a different format
            const pdfBuffer = await this.generatePDF(xml!, dataFromXML, parametros);

            const tipoDocumentoDescripcion = dataFromXML.tipoDocumentoDescripcion;
            const timbrado = dataFromXML.timbrado;
            const establecimiento = dataFromXML.establecimiento;
            const punto = dataFromXML.punto;
            const numero = dataFromXML.numero;
            const serie = dataFromXML.serie;

            const fileName = `${tipoDocumentoDescripcion}_${timbrado}-${establecimiento}-${punto}-${numero}${serie ? '-' + serie : ''}.pdf`;
            const fullPathDestino = path.join(pathDestino, fileName);

            fs.writeFileSync(fullPathDestino, pdfBuffer);
            console.log(`PDF generated successfully: ${fullPathDestino}`);
          } catch (error) {
            console.error('Error generating PDF:', error);
            throw error;
          }
        } else {
          throw new Error("Debe indicar el Path Destino para generación del PDF");
        }
      } else {
        throw new Error("Debe indicar el Path Origen de los archivos .jasper");
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  }

  private generatePDF(xml: string, documentData: DocumentData, parametros: Record<string, any>): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Parse XML to extract item data (similar to JasperReports data source)
        let xmlContent: string;
        if (xml.startsWith('<?xml')) {
          xmlContent = xml;
        } else {
          xmlContent = fs.readFileSync(xml, 'utf8');
        }

        const parsedXML = this.xmlParser.parse(xmlContent);

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
          const rDE = parsedXML.rDE;
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

  private getTipoDocumentoFromXML(archivoDEXML: string): DocumentData {
    try {
      let xmlContent: string;

      if (archivoDEXML.startsWith('<?xml')) {
        xmlContent = archivoDEXML;
      } else {
        xmlContent = fs.readFileSync(archivoDEXML, 'utf8');
      }

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
      throw new Error(`Error parsing XML: ${error.message}`);
    }
  }
}

// For command line usage
if (require.main === module) {
  CreateKude.main(process.argv.slice(2)).catch(console.error);
}

export default CreateKude;
