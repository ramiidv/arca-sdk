/**
 * Ejemplo: Manejo de errores
 *
 * El SDK provee clases de error específicas para catch granular:
 *   - ArcaAuthError: falla de autenticación WSAA
 *   - ArcaWSFEError: error de negocio de ARCA (con códigos)
 *   - ArcaSoapError: error HTTP/SOAP (timeout, servidor caído)
 */

import fs from "fs";
import {
  Arca,
  CbteTipo,
  IvaTipo,
  ArcaAuthError,
  ArcaWSFEError,
  ArcaSoapError,
} from "@ramiidv/arca-sdk";

async function main() {
  const arca = new Arca({
    cuit: 20123456789,
    cert: fs.readFileSync("./certs/certificado.crt", "utf-8"),
    key: fs.readFileSync("./certs/clave.key", "utf-8"),
    production: false,
    requestTimeoutMs: 60_000, // 60s para servidores lentos
  });

  try {
    const result = await arca.facturar({
      ptoVta: 1,
      cbteTipo: CbteTipo.FACTURA_B,
      items: [{ neto: 100, iva: IvaTipo.IVA_21 }],
    });

    if (!result.aprobada) {
      // ARCA respondió pero rechazó el comprobante
      console.error("Rechazada:", result.observaciones);
      return;
    }

    console.log(`CAE: ${result.cae}`);
  } catch (e) {
    if (e instanceof ArcaAuthError) {
      // Certificado inválido, expirado, o respuesta WSAA inesperada
      console.error("Error de autenticación:", e.message);
      arca.clearAuthCache();
    } else if (e instanceof ArcaWSFEError) {
      // Error de negocio con códigos de ARCA
      for (const err of e.errors) {
        console.error(`ARCA [${err.code}]: ${err.msg}`);
      }
    } else if (e instanceof ArcaSoapError) {
      // Timeout, HTTP 500, SOAP Fault
      console.error("Error de conexión:", e.message);
      if (e.statusCode) console.error("HTTP status:", e.statusCode);
    } else {
      throw e;
    }
  }
}

main().catch(console.error);
