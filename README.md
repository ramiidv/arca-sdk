# @ramiidv/arca-sdk

> **Este paquete fue renombrado a [`@ramiidv/arca-facturacion`](https://github.com/ramiidv/arca-facturacion).**

## Migración

```bash
npm uninstall @ramiidv/arca-sdk
npm install @ramiidv/arca-facturacion
```

Luego actualizá tus imports:

```diff
- import { Arca } from '@ramiidv/arca-sdk'
+ import { Arca } from '@ramiidv/arca-facturacion'
```

La API es 100% compatible. El paquete `@ramiidv/arca-sdk@1.3.0` en npm es un wrapper de compatibilidad que re-exporta todo desde `@ramiidv/arca-facturacion` y será removido en una versión futura.

## Ecosistema ARCA

| Paquete | Descripción |
| --- | --- |
| [`@ramiidv/arca-common`](https://github.com/ramiidv/arca-common) | Utilidades compartidas (WSAA, SOAP, validadores) |
| [`@ramiidv/arca-facturacion`](https://github.com/ramiidv/arca-facturacion) | Facturación electrónica (WSFE, WSFEX, CAEA) |
| [`@ramiidv/arca-padron`](https://github.com/ramiidv/arca-padron) | Consulta de contribuyentes (Padrón A4, A10, A100) |
| [`@ramiidv/arca-empleados`](https://github.com/ramiidv/arca-empleados) | Gestión de empleados (F935) |
| [`@ramiidv/arca-cdc`](https://github.com/ramiidv/arca-cdc) | Constatación de comprobantes (WSCDC) |
| [`@ramiidv/arca-fecred`](https://github.com/ramiidv/arca-fecred) | Factura de Crédito Electrónica MiPyME (WSFECRED) |
| [`@ramiidv/arca-sire`](https://github.com/ramiidv/arca-sire) | Retenciones electrónicas (SIRE) |
| [`@ramiidv/arca-agro`](https://github.com/ramiidv/arca-agro) | Carta de porte, CTG, liquidaciones de granos |
| [`@ramiidv/arca-mtxca`](https://github.com/ramiidv/arca-mtxca) | Facturación con detalle de artículos (WSMTXCA) |
