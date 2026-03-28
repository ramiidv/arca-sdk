import { ENDPOINTS } from "./constants.js";
import { wsfeSoapCall } from "./soap-client.js";
import { ArcaWSFEError } from "./errors.js";
import type {
  WsfeAuth,
  InvoiceRequest,
  InvoiceDetail,
  FECAESolicitarResult,
  FECompUltimoAutorizadoResult,
  FECompConsultarResult,
  ServerStatus,
  ParamItem,
  MonedaItem,
  PtoVentaItem,
  CotizacionResult,
  WsError,
} from "./types.js";

function toArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}

interface WsfeResult {
  Errors?: { Err: WsError | WsError[] };
  ResultGet?: Record<string, unknown>;
}

function checkErrors(result: WsfeResult): void {
  if (result.Errors) {
    const errs = toArray(result.Errors.Err);
    throw new ArcaWSFEError(errs.map((e) => ({ code: e.Code, msg: e.Msg })));
  }
}

export class WsfeClient {
  private endpoint: string;
  private timeoutMs: number;

  constructor(production: boolean, timeoutMs: number = 30_000) {
    this.endpoint = production
      ? ENDPOINTS.wsfe.production
      : ENDPOINTS.wsfe.testing;
    this.timeoutMs = timeoutMs;
  }

  // ============================================================
  // Facturación
  // ============================================================

  /**
   * Solicita CAE (Código de Autorización Electrónica) para uno o más comprobantes.
   */
  async solicitarCAE(
    auth: WsfeAuth,
    request: InvoiceRequest
  ): Promise<FECAESolicitarResult> {
    const detRequests = request.invoices.map((inv) =>
      this.buildDetRequest(inv)
    );

    const params = {
      Auth: auth,
      FeCAEReq: {
        FeCabReq: {
          CantReg: request.invoices.length,
          PtoVta: request.PtoVta,
          CbteTipo: request.CbteTipo,
        },
        FeDetReq: {
          FECAEDetRequest: detRequests,
        },
      },
    };

    const result = (await wsfeSoapCall(
      this.endpoint,
      "FECAESolicitar",
      params,
      this.timeoutMs
    )) as FECAESolicitarResult;

    checkErrors(result);
    return result;
  }

  /**
   * Obtiene el último número de comprobante autorizado para un punto de venta y tipo.
   */
  async ultimoComprobante(
    auth: WsfeAuth,
    ptoVta: number,
    cbteTipo: number
  ): Promise<number> {
    const result = (await wsfeSoapCall(
      this.endpoint,
      "FECompUltimoAutorizado",
      {
        Auth: auth,
        PtoVta: ptoVta,
        CbteTipo: cbteTipo,
      },
      this.timeoutMs
    )) as FECompUltimoAutorizadoResult;

    checkErrors(result);
    return result.CbteNro;
  }

  /**
   * Consulta un comprobante previamente autorizado.
   */
  async consultarComprobante(
    auth: WsfeAuth,
    cbteTipo: number,
    ptoVta: number,
    cbteNro: number
  ): Promise<FECompConsultarResult> {
    const result = (await wsfeSoapCall(this.endpoint, "FECompConsultar", {
      Auth: auth,
      FeCompConsReq: {
        CbteTipo: cbteTipo,
        CbteNro: cbteNro,
        PtoVta: ptoVta,
      },
    }, this.timeoutMs)) as FECompConsultarResult;

    checkErrors(result);
    return result;
  }

  // ============================================================
  // Parámetros
  // ============================================================

  /**
   * Verifica el estado de los servidores de ARCA.
   */
  async serverStatus(): Promise<ServerStatus> {
    const result = await wsfeSoapCall(this.endpoint, "FEDummy", {}, this.timeoutMs);
    return result as ServerStatus;
  }

  /**
   * Obtiene los tipos de comprobante disponibles.
   */
  private async getParam<T>(
    auth: WsfeAuth,
    method: string,
    itemKey: string
  ): Promise<T[]> {
    const result = (await wsfeSoapCall(
      this.endpoint,
      method,
      { Auth: auth },
      this.timeoutMs
    )) as WsfeResult;
    checkErrors(result);
    return toArray(result.ResultGet?.[itemKey] as T | T[] | undefined);
  }

  async getTiposComprobante(auth: WsfeAuth): Promise<ParamItem[]> {
    return this.getParam(auth, "FEParamGetTiposCbte", "CbteTipo");
  }

  /** Obtiene los tipos de concepto disponibles. */
  async getTiposConcepto(auth: WsfeAuth): Promise<ParamItem[]> {
    return this.getParam(auth, "FEParamGetTiposConcepto", "ConceptoTipo");
  }

  /** Obtiene los tipos de documento disponibles. */
  async getTiposDocumento(auth: WsfeAuth): Promise<ParamItem[]> {
    return this.getParam(auth, "FEParamGetTiposDoc", "DocTipo");
  }

  /** Obtiene los tipos de IVA disponibles. */
  async getTiposIva(auth: WsfeAuth): Promise<ParamItem[]> {
    return this.getParam(auth, "FEParamGetTiposIva", "IvaTipo");
  }

  /** Obtiene las monedas disponibles. */
  async getMonedas(auth: WsfeAuth): Promise<MonedaItem[]> {
    return this.getParam(auth, "FEParamGetTiposMonedas", "Moneda");
  }

  /** Obtiene los tipos de tributo disponibles. */
  async getTiposTributo(auth: WsfeAuth): Promise<ParamItem[]> {
    return this.getParam(auth, "FEParamGetTiposTributos", "TributoTipo");
  }

  /** Obtiene los tipos de opcionales disponibles. */
  async getTiposOpcional(auth: WsfeAuth): Promise<ParamItem[]> {
    return this.getParam(auth, "FEParamGetTiposOpcional", "OpcionalTipo");
  }

  /** Obtiene los puntos de venta habilitados. */
  async getPuntosVenta(auth: WsfeAuth): Promise<PtoVentaItem[]> {
    return this.getParam(auth, "FEParamGetPtosVenta", "PtoVenta");
  }

  /** Obtiene la cotización de una moneda. */
  async getCotizacion(
    auth: WsfeAuth,
    monedaId: string
  ): Promise<CotizacionResult> {
    const result = (await wsfeSoapCall(
      this.endpoint,
      "FEParamGetCotizacion",
      { Auth: auth, MonId: monedaId },
      this.timeoutMs
    )) as WsfeResult & CotizacionResult;
    checkErrors(result);
    return result;
  }

  /** Obtiene la cantidad máxima de registros por request de FECAESolicitar. */
  async getCantMaxRegistros(auth: WsfeAuth): Promise<number> {
    const result = (await wsfeSoapCall(
      this.endpoint,
      "FECompTotXRequest",
      { Auth: auth },
      this.timeoutMs
    )) as WsfeResult & { RegXReq?: number };
    checkErrors(result);
    return result.RegXReq ?? 0;
  }

  // ============================================================
  // Helpers
  // ============================================================

  private buildDetRequest(inv: InvoiceDetail): Record<string, any> {
    const det: Record<string, any> = {
      Concepto: inv.Concepto,
      DocTipo: inv.DocTipo,
      DocNro: inv.DocNro,
      CbteDesde: inv.CbteDesde,
      CbteHasta: inv.CbteHasta,
      CbteFch: inv.CbteFch,
      ImpTotal: inv.ImpTotal,
      ImpTotConc: inv.ImpTotConc,
      ImpNeto: inv.ImpNeto,
      ImpOpEx: inv.ImpOpEx,
      ImpTrib: inv.ImpTrib,
      ImpIVA: inv.ImpIVA,
      MonId: inv.MonId,
      MonCotiz: inv.MonCotiz,
    };

    if (inv.FchServDesde) det.FchServDesde = inv.FchServDesde;
    if (inv.FchServHasta) det.FchServHasta = inv.FchServHasta;
    if (inv.FchVtoPago) det.FchVtoPago = inv.FchVtoPago;

    if (inv.Iva && inv.Iva.length > 0) {
      det.Iva = {
        AlicIva: inv.Iva.map((i) => ({
          Id: i.Id,
          BaseImp: i.BaseImp,
          Importe: i.Importe,
        })),
      };
    }

    if (inv.Tributos && inv.Tributos.length > 0) {
      det.Tributos = {
        Tributo: inv.Tributos.map((t) => ({
          Id: t.Id,
          Desc: t.Desc,
          BaseImp: t.BaseImp,
          Alic: t.Alic,
          Importe: t.Importe,
        })),
      };
    }

    if (inv.CbtesAsoc && inv.CbtesAsoc.length > 0) {
      det.CbtesAsoc = {
        CbteAsoc: inv.CbtesAsoc.map((c) => {
          const asoc: Record<string, any> = {
            Tipo: c.Tipo,
            PtoVta: c.PtoVta,
            Nro: c.Nro,
          };
          if (c.Cuit) asoc.Cuit = c.Cuit;
          if (c.CbteFch) asoc.CbteFch = c.CbteFch;
          return asoc;
        }),
      };
    }

    if (inv.Opcionales && inv.Opcionales.length > 0) {
      det.Opcionales = {
        Opcional: inv.Opcionales.map((o) => ({
          Id: o.Id,
          Valor: o.Valor,
        })),
      };
    }

    return det;
  }
}
