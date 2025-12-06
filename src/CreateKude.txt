 import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.data.JRXmlDataSource;
import org.apache.log4j.Level;
import org.apache.log4j.Logger;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;

public class CreateKude {
   public static void main(String[] args) throws Exception {
      Logger.getRootLogger().setLevel(Level.ERROR);
      String xml = null;
      if (args.length > 0 && args[0] != null) {
         xml = args[0];
      } else {
         xml = "C:\\Users\\marco\\git\\tipscloud\\KUDE\\resources\\Extructura xml_DE.xml";
      }

      Map<String, Object> dataFromXML = getTipoDocumentoFromXML(xml);
      int tipoDocumento = (Integer)dataFromXML.get("tipoDocumento");
      String jasperPath = null;
      if (args.length > 1 && args[1] != null) {
         jasperPath = args[1];
         System.out.println("jasper path del par 1 vale " + jasperPath);
         String pathDestino = null;
         if (args.length > 2 && args[2] != null) {
            pathDestino = args[2];
            Object parametros = new HashMap();
            Gson inputStream;
            if (args.length > 3 && args[3] != null) {
               inputStream = (new GsonBuilder()).setDateFormat("yyyy-MM-dd'T'HH:mm:ss").create();

               try {
                  parametros = (Map)inputStream.fromJson(args[3], parametros.getClass());
               } catch (Exception var18) {
                  System.err.println("Error ignorado... No se pudo convertir " + args[3] + " a Objeto!");
               }
            }

            if (tipoDocumento == 1) {
               jasperPath = jasperPath + "Factura.jasper";
            }

            if (tipoDocumento == 2) {
               jasperPath = jasperPath + "FacturaImportacion.jasper";
            }

            if (tipoDocumento == 3) {
               jasperPath = jasperPath + "FacturaExportacion.jasper";
            }

            if (tipoDocumento == 4) {
               jasperPath = jasperPath + "AutoFactura.jasper";
            }

            if (tipoDocumento == 5) {
               jasperPath = jasperPath + "NotaCredito.jasper";
            }

            if (tipoDocumento == 6) {
               jasperPath = jasperPath + "NotaDebito.jasper";
            }

            if (tipoDocumento == 7) {
               jasperPath = jasperPath + "NotaRemision.jasper";
            }

            System.out.println("----" + jasperPath);
            if (!(new File(jasperPath)).exists()) {
               throw new Exception("Archivo " + jasperPath + " no encontrado.!");
            } else {
               try {
                  inputStream = null;
                  Object inputStream;
                  if (xml.startsWith("<?xml")) {
                     inputStream = new ByteArrayInputStream(xml.getBytes());
                  } else {
                     inputStream = new FileInputStream(xml);
                  }

                  JRXmlDataSource dataSource = new JRXmlDataSource((InputStream)inputStream, "/rDE/DE/gDtipDE/gCamItem");
                  Locale locale = new Locale("es", "PY");
                  ((Map)parametros).put("REPORT_LOCALE", locale);
                  JasperPrint jprint = JasperFillManager.fillReport(jasperPath, (Map)parametros, dataSource);
                  String tipoDocumentoDescripcion = (String)dataFromXML.get("tipoDocumentoDescripcion");
                  String timbrado = (String)dataFromXML.get("timbrado");
                  String establecimiento = (String)dataFromXML.get("establecimiento");
                  String punto = (String)dataFromXML.get("punto");
                  String numero = (String)dataFromXML.get("numero");
                  String serie = (String)dataFromXML.get("serie");
                  pathDestino = pathDestino + tipoDocumentoDescripcion + "_" + timbrado + "-" + establecimiento + "-" + punto + "-" + numero + (serie != null ? "-" + serie : "") + ".pdf";
                  JasperExportManager.exportReportToPdfFile(jprint, pathDestino);
               } catch (Exception var17) {
                  var17.printStackTrace();
               }

            }
         } else {
            throw new Exception("Debe indicar el Path Destino para generación del PDF");
         }
      } else {
         throw new Exception("Debe indicar el Path Origen de los archivos .jasper");
      }
   }

   public static Map<String, Object> getTipoDocumentoFromXML(String archivoDEXML) throws Exception {
      Map<String, Object> dataFromXML = new HashMap();
      File file = new File(archivoDEXML);
      DocumentBuilderFactory documentBuilderFactory = DocumentBuilderFactory.newInstance();
      DocumentBuilder documentBuilder = documentBuilderFactory.newDocumentBuilder();
      Document document = null;
      if (archivoDEXML.startsWith("<?xml")) {
         InputStream inputStream = new ByteArrayInputStream(archivoDEXML.getBytes());
         document = documentBuilder.parse(inputStream);
      } else {
         document = documentBuilder.parse(file);
      }

      Node student = document.getElementsByTagName("rDE").item(0);
      Element dataFileElement = (Element)student;
      Node dataFile = dataFileElement.getElementsByTagName("DE").item(0);
      Element locationElement = (Element)dataFile;
      Node location = locationElement.getElementsByTagName("gTimb").item(0);
      Element iTipoDEElement = (Element)dataFile;
      Node iTiDE = iTipoDEElement.getElementsByTagName("iTiDE").item(0);
      Integer tipoDocumento = Integer.valueOf(iTiDE.getTextContent());
      Node dDesTiDE = iTipoDEElement.getElementsByTagName("dDesTiDE").item(0);
      String tipoDocumentoDescripcion = dDesTiDE.getTextContent();
      Node dNumTim = iTipoDEElement.getElementsByTagName("dNumTim").item(0);
      String timbrado = dNumTim.getTextContent();
      Node dEst = iTipoDEElement.getElementsByTagName("dEst").item(0);
      String establecimiento = dEst.getTextContent();
      Node dPunExp = iTipoDEElement.getElementsByTagName("dPunExp").item(0);
      String punto = dPunExp.getTextContent();
      Node dNumDoc = iTipoDEElement.getElementsByTagName("dNumDoc").item(0);
      String numero = dNumDoc.getTextContent();
      Node dSerieNum = iTipoDEElement.getElementsByTagName("dSerieNum").item(0);
      String serie = null;
      if (dSerieNum != null) {
         dSerieNum.getTextContent();
      }

      dataFromXML.put("tipoDocumento", tipoDocumento);
      dataFromXML.put("tipoDocumentoDescripcion", tipoDocumentoDescripcion);
      dataFromXML.put("timbrado", timbrado);
      dataFromXML.put("establecimiento", establecimiento);
      dataFromXML.put("punto", punto);
      dataFromXML.put("numero", numero);
      dataFromXML.put("serie", serie);
      return dataFromXML;
   }
}
    