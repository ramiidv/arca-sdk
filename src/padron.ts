import {
  ENDPOINTS,
  PADRON_A5_NAMESPACE,
  PADRON_A13_NAMESPACE,
} from "./constants.js";
import { afipSoapCall, toArray } from "./soap-client.js";
import type { SoapOptions } from "./soap-client.js";
import type { WsfeAuth, Contribuyente, ArcaEvent } from "./types.js";

function parsePersona(raw: Record<string, any>): Contribuyente {
  const persona = raw.personaReturn?.persona ?? raw.personaReturn ?? raw;

  const nombre =
    persona.razonSocial ??
    [persona.apellido, persona.nombre].filter(Boolean).join(" ") ??
    "";

  const domFiscal = persona.domicilio
    ? Array.isArray(persona.domicilio)
      ? persona.domicilio[0]
      : persona.domicilio
    : undefined;

  const impuestos = persona.impuesto
    ? toArray(persona.impuesto).map((i: any) => ({
        id: i.idImpuesto ?? i.id ?? 0,
        descripcion: i.descripcionImpuesto ?? i.descripcion ?? "",
        estado: i.estado ?? "",
      }))
    : undefined;

  return {
    cuit: persona.idPersona ?? 0,
    nombre,
    tipoPersona: persona.tipoPersona ?? "",
    estadoClave: persona.estadoClave ?? "",
    domicilioFiscal: domFiscal
      ? {
          direccion: domFiscal.direccion,
          localidad: domFiscal.localidad,
          codPostal: domFiscal.codPostal,
          tipoDomicilio: domFiscal.tipoDomicilio,
        }
      : undefined,
    impuestos,
    raw: persona,
  };
}

export class PadronClient {
  private production: boolean;
  private soapOpts: Omit<SoapOptions, "soapAction">;

  constructor(
    production: boolean,
    opts: {
      timeoutMs?: number;
      retries?: number;
      retryDelayMs?: number;
      onEvent?: (event: ArcaEvent) => void;
    } = {}
  ) {
    this.production = production;
    this.soapOpts = {
      timeoutMs: opts.timeoutMs,
      retries: opts.retries,
      retryDelayMs: opts.retryDelayMs,
      onEvent: opts.onEvent,
    };
  }

  /**
   * Consulta datos de un contribuyente usando el padrón A13 (básico).
   * Requiere cert con acceso a ws_sr_padron_a13.
   */
  async getPersonaA13(
    auth: WsfeAuth,
    cuit: number
  ): Promise<Contribuyente> {
    const endpoint = this.production
      ? ENDPOINTS.padronA13.production
      : ENDPOINTS.padronA13.testing;

    const result = await afipSoapCall(
      endpoint,
      PADRON_A13_NAMESPACE,
      "getPersona",
      {
        token: auth.Token,
        sign: auth.Sign,
        cuitRepresentada: auth.Cuit,
        idPersona: cuit,
      },
      this.soapOpts
    );

    return parsePersona(result);
  }

  /**
   * Consulta datos detallados de un contribuyente usando el padrón A5.
   * Requiere cert con acceso a ws_sr_padron_a5 (autorización adicional).
   */
  async getPersonaA5(
    auth: WsfeAuth,
    cuit: number
  ): Promise<Contribuyente> {
    const endpoint = this.production
      ? ENDPOINTS.padronA5.production
      : ENDPOINTS.padronA5.testing;

    const result = await afipSoapCall(
      endpoint,
      PADRON_A5_NAMESPACE,
      "getPersona",
      {
        token: auth.Token,
        sign: auth.Sign,
        cuitRepresentada: auth.Cuit,
        idPersona: cuit,
      },
      this.soapOpts
    );

    return parsePersona(result);
  }
}
